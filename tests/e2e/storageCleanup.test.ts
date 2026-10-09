// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";

import prisma from "@/application/repositories/database";
import * as cleanupRepository from "@/application/repositories/storageCleanupRepository";
import {
  planStorageCleanup,
  recordStorageDeletion,
  type CleanupObject,
} from "@/application/repositories/storageCleanupRepository";
import { updateStudentCv } from "@/application/repositories/studentRepository";
import { runStorageCleanup } from "@/application/services/storageCleanupService";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));
const storage = vi.hoisted(() => ({
  listObjects: vi.fn(),
  deleteObject: vi.fn(),
  assertUnversionedBucket: vi.fn(),
}));
vi.mock("@/application/services/objectStorageService", () => storage);
const fixtures = databaseFixtures(prisma);
const keys: string[] = [];
const sponsorIds: string[] = [];
const now = new Date("2026-10-08T03:00:00Z");
const old = new Date("2026-04-08T02:59:59.999Z");
const newKey = (kind: "cv" | "avatar") => {
  const id = randomUUID();
  const key = `distribution/${kind}/${id}${kind === "cv" ? ".pdf" : ""}`;
  keys.push(key);
  return { id, key };
};
beforeEach(() => {
  vi.resetAllMocks();
  storage.listObjects.mockResolvedValue([]);
});
afterEach(async () => {
  await fixtures.cleanup();
  await prisma.sponsor.deleteMany({
    where: { id: { in: sponsorIds.splice(0) } },
  });
  await prisma.storageDeletion.deleteMany({
    where: { key: { in: keys.splice(0) } },
  });
});
afterAll(() => prisma.$disconnect());

async function studentCv(cv: string, cvUploadedAt: Date | null) {
  const student = await fixtures.student();
  return prisma.student.update({
    where: { id: student.id },
    data: { cv, cvUploadedAt },
  });
}

test("six calendar months: dry run projects purge, apply detaches and queues, boundary/unknown age stay", async () => {
  const expired = newKey("cv");
  const boundary = newKey("cv");
  const unknown = newKey("cv");
  const a = await studentCv(expired.id, old);
  const b = await studentCv(boundary.id, new Date("2026-04-08T03:00:00Z"));
  const c = await studentCv(unknown.id, null);
  const objects = [expired, boundary, unknown].map(({ key }) => ({
    kind: "cv" as const,
    key,
  }));
  const dry = await planStorageCleanup(now, objects, false);
  expect(dry.expired.map(({ id }) => id)).toContain(a.id);
  expect(dry.orphans).toEqual([{ kind: "cv", key: expired.key }]);
  expect(dry.unknownAge).toBeGreaterThanOrEqual(1);
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: a.id } })).cv
  ).toBe(expired.id);
  expect(
    await prisma.storageDeletion.count({ where: { key: expired.key } })
  ).toBe(0);
  await planStorageCleanup(now, objects, true);
  expect(
    await prisma.student.findUniqueOrThrow({ where: { id: a.id } })
  ).toMatchObject({ cv: null, cvPurgedAt: now, cvUploadedAt: old });
  for (const student of [b, c])
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).cv
    ).toBe(student.cv);
  expect(
    await prisma.storageDeletion.findUnique({
      where: { kind_key: { kind: "cv", key: expired.key } },
    })
  ).toMatchObject({ deletedAt: null, attempts: 0 });
});

test("month-end cutoff clamps to valid calendar day rather than 180 days", async () => {
  const a = newKey("cv");
  const b = newKey("cv");
  const expired = await studentCv(a.id, new Date("2026-02-28T02:59:59Z"));
  const boundary = await studentCv(b.id, new Date("2026-02-28T03:00:00Z"));
  const plan = await planStorageCleanup(
    new Date("2026-08-31T03:00:00Z"),
    [],
    false
  );
  expect(plan.expired.map(({ id }) => id)).toContain(expired.id);
  expect(plan.expired.map(({ id }) => id)).not.toContain(boundary.id);
});

test("UUID casing protects both literal S3 keys and blocks case-variant reattachment", async () => {
  const avatar = newKey("avatar");
  const cv = newKey("cv");
  const student = await studentCv(cv.id.toUpperCase(), now);
  await prisma.student.update({
    where: { id: student.id },
    data: { avatar: `/api/media/avatar/${avatar.id.toUpperCase()}` },
  });
  const uppercaseKey = avatar.key.replace(avatar.id, avatar.id.toUpperCase());
  keys.push(uppercaseKey);
  const objects: CleanupObject[] = [
    { kind: "avatar", key: avatar.key },
    { kind: "avatar", key: uppercaseKey },
    { kind: "cv", key: cv.key },
  ];
  expect((await planStorageCleanup(now, objects, true)).orphans).toEqual([]);
  await prisma.student.update({
    where: { id: student.id },
    data: { avatar: null },
  });
  await planStorageCleanup(now, objects, true);
  for (const reference of [avatar.id, avatar.id.toUpperCase(), uppercaseKey])
    await expect(
      prisma.student.update({
        where: { id: student.id },
        data: { avatar: reference },
      })
    ).rejects.toThrow("queued for deletion");
  const mapping = await prisma.$queryRaw<{ key: string | null }[]>`
    SELECT storage_object_key('cv', ${`https://legacy.supabase.co/storage/v1/object/public/cvs/distribution/cv/${cv.id.toUpperCase()}.pdf?token=private`}) AS key
    UNION ALL SELECT storage_object_key('logo', ${avatar.id})`;
  expect(mapping).toEqual([{ key: cv.key }, { key: null }]);
  await expect(
    prisma.storageDeletion.create({
      data: { kind: "logo", key: avatar.key },
    })
  ).rejects.toThrow();
});

test("unrecognized expired CV references remain visible for investigation", async () => {
  const student = await studentCv("https://external.invalid/legacy-file", old);
  const plan = await planStorageCleanup(now, [], true);
  expect(plan.expired.map(({ id }) => id)).not.toContain(student.id);
  expect(plan).toMatchObject({ unknownReference: 1 });
  expect(
    await prisma.student.findUniqueOrThrow({ where: { id: student.id } })
  ).toMatchObject({ cv: student.cv, cvPurgedAt: null });
});

test("fresh shared CV and all supported avatar refs protect objects, including inactive company/sponsor", async () => {
  const cv = newKey("cv");
  await studentCv(cv.id, old);
  await studentCv(
    `https://legacy.supabase.co/storage/v1/object/public/cvs/${cv.key}?x=1`,
    now
  );
  const forms = [
    (id: string) => id,
    (_id: string, key: string) => key,
    (id: string) => `/api/media/avatar/${id}`,
    (id: string) =>
      `https://fallstack.example/api/media/avatar/${id}?v=1#image`,
    (_id: string, key: string) =>
      `https://legacy.supabase.co/storage/v1/object/public/avatars/${key}?v=1`,
  ];
  const objects: CleanupObject[] = [{ kind: "cv", key: cv.key }];
  for (const form of forms) {
    const avatar = newKey("avatar");
    const student = await fixtures.student();
    await prisma.student.update({
      where: { id: student.id },
      data: { avatar: form(avatar.id, avatar.key) },
    });
    objects.push({ kind: "avatar", key: avatar.key });
  }
  const companyAvatar = newKey("avatar");
  const company = await fixtures.company();
  await prisma.company.update({
    where: { id: company.id },
    data: { avatar: `/api/media/avatar/${companyAvatar.id}`, active: false },
  });
  const sponsorAvatar = newKey("avatar");
  const sponsor = await prisma.sponsor.create({
    data: {
      name: randomUUID(),
      logo: `/api/media/avatar/${sponsorAvatar.id}`,
      active: false,
      order: 389,
    },
  });
  sponsorIds.push(sponsor.id);
  objects.push(
    { kind: "avatar", key: companyAvatar.key },
    { kind: "avatar", key: sponsorAvatar.key }
  );
  expect((await planStorageCleanup(now, objects, true)).orphans).toEqual([]);
});

test("failure leaves detached refs + durable retry; success blocks late reattachment", async () => {
  const cv = newKey("cv");
  const student = await studentCv(cv.id, old);
  storage.listObjects.mockImplementation(async (kind: string) =>
    kind === "cv" ? [{ Key: cv.key, LastModified: old }] : []
  );
  storage.deleteObject.mockRejectedValueOnce(
    Object.assign(new Error("secret"), { name: "AccessDenied" })
  );
  expect((await runStorageCleanup({ now, apply: true })).failed).toBe(1);
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).cv
  ).toBeNull();
  expect(
    await prisma.storageDeletion.findUniqueOrThrow({
      where: { kind_key: { kind: "cv", key: cv.key } },
    })
  ).toMatchObject({ attempts: 1, deletedAt: null, lastError: "AccessDenied" });
  storage.deleteObject.mockResolvedValue(undefined);
  expect((await runStorageCleanup({ now, apply: true })).deleted).toBe(1);
  expect(
    await prisma.storageDeletion.findUniqueOrThrow({
      where: { kind_key: { kind: "cv", key: cv.key } },
    })
  ).toMatchObject({ attempts: 2, deletedAt: now, lastError: null });
  await recordStorageDeletion("cv", cv.key, now, "late concurrent failure");
  expect(
    (
      await prisma.storageDeletion.findUniqueOrThrow({
        where: { kind_key: { kind: "cv", key: cv.key } },
      })
    ).lastError
  ).toBeNull();
  await expect(
    prisma.student.update({ where: { id: student.id }, data: { cv: cv.id } })
  ).rejects.toThrow("queued for deletion");
  const fresh = newKey("cv");
  await updateStudentCv(student.code, fresh.id);
  expect(
    await prisma.student.findUniqueOrThrow({ where: { id: student.id } })
  ).toMatchObject({ cv: fresh.id, cvPurgedAt: null });
});

test("queued avatar keys cannot be attached to Company or Sponsor", async () => {
  const avatar = newKey("avatar");
  const company = await fixtures.company();
  await planStorageCleanup(now, [{ kind: "avatar", key: avatar.key }], true);
  await expect(
    prisma.company.update({
      where: { id: company.id },
      data: { avatar: `/api/media/avatar/${avatar.id}` },
    })
  ).rejects.toThrow("queued for deletion");
  await expect(
    prisma.sponsor.create({
      data: {
        name: randomUUID(),
        logo: `/api/media/avatar/${avatar.id}`,
        order: 389,
      },
    })
  ).rejects.toThrow("queued for deletion");
});

test("DB acknowledgement failure after S3 deletion leaves a retryable queue row", async () => {
  const cv = newKey("cv");
  await studentCv(cv.id, old);
  storage.listObjects.mockImplementation(async (kind: string) =>
    kind === "cv" ? [{ Key: cv.key, LastModified: old }] : []
  );
  const record = vi
    .spyOn(cleanupRepository, "recordStorageDeletion")
    .mockRejectedValueOnce(new Error("DB unavailable"));
  try {
    await expect(runStorageCleanup({ now, apply: true })).rejects.toThrow(
      "DB unavailable"
    );
    expect(
      await prisma.storageDeletion.findUniqueOrThrow({
        where: { kind_key: { kind: "cv", key: cv.key } },
      })
    ).toMatchObject({ deletedAt: null, attempts: 0 });
  } finally {
    record.mockRestore();
  }
  expect((await runStorageCleanup({ now, apply: true })).deleted).toBe(1);
  expect(storage.deleteObject).toHaveBeenCalledTimes(2);
});

test("a concurrent writer waiting behind claim cannot attach a tombstoned avatar", async () => {
  const avatar = newKey("avatar");
  const student = await fixtures.student();
  let locked!: () => void;
  let release!: () => void;
  const lockReady = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const claim = prisma.$transaction(async (tx) => {
    await tx.$executeRaw`LOCK TABLE "Student", "Company", "Sponsor" IN SHARE ROW EXCLUSIVE MODE`;
    locked();
    await proceed;
    await tx.storageDeletion.create({
      data: { kind: "avatar", key: avatar.key },
    });
  });
  await lockReady;
  const writer = prisma.student.update({
    where: { id: student.id },
    data: { avatar: `/api/media/avatar/${avatar.id}` },
  });
  // Start Prisma's lazy request before allowing the claimant to commit.
  const result = Promise.allSettled([writer]);
  try {
    // Verify the UPDATE really reached PostgreSQL and waits on the table lock.
    const deadline = Date.now() + 2000;
    let waiting = false;
    while (!waiting && Date.now() < deadline) {
      const rows = await prisma.$queryRaw<{ waiting: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_locks WHERE relation = '"Student"'::regclass
          AND mode = 'RowExclusiveLock' AND NOT granted
        ) AS waiting`;
      waiting = rows[0].waiting;
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
  } finally {
    release();
  }
  await claim;
  expect((await result)[0]).toMatchObject({ status: "rejected" });
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: student.id } }))
      .avatar
  ).toBeNull();
});
