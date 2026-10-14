// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";

import { httpErrorResponse } from "@/lib/http/server";
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
    UNION ALL SELECT storage_object_key('unknown', ${avatar.id})`;
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
  expect(plan.unknownReference).toBeGreaterThanOrEqual(1);
  expect(
    await prisma.student.findUniqueOrThrow({ where: { id: student.id } })
  ).toMatchObject({ cv: student.cv, cvPurgedAt: null });
});

test.each(["cv", "studentAvatar", "companyAvatar", "sponsorLogo"])(
  "unknown %s references block all object claims and pending deletes",
  async (field) => {
    const avatar = newKey("avatar");
    const pending = newKey("cv");
    const expiring = await studentCv(newKey("cv").id, old);
    await prisma.storageDeletion.create({
      data: { kind: "cv", key: pending.key },
    });
    if (field === "sponsorLogo") {
      const sponsor = await prisma.sponsor.create({
        data: {
          name: randomUUID(),
          logo: "https://unknown.invalid/reference",
          order: 402,
        },
      });
      sponsorIds.push(sponsor.id);
    } else if (field === "companyAvatar") {
      const company = await fixtures.company();
      await prisma.company.update({
        where: { id: company.id },
        data: { avatar: "https://unknown.invalid/reference" },
      });
    } else {
      const student = await fixtures.student();
      await prisma.student.update({
        where: { id: student.id },
        data:
          field === "cv"
            ? { cv: "https://unknown.invalid/reference", cvUploadedAt: old }
            : { avatar: "https://unknown.invalid/reference" },
      });
    }
    const objects = [{ kind: "avatar" as const, key: avatar.key }];
    for (const apply of [false, true]) {
      const plan = await planStorageCleanup(now, objects, apply);
      expect(plan.unknownReference).toBeGreaterThanOrEqual(1);
      expect(plan.orphans).toEqual([]);
      expect(
        await prisma.storageDeletion.count({ where: { key: avatar.key } })
      ).toBe(0);
    }
    storage.listObjects.mockResolvedValue([
      { Key: avatar.key, LastModified: old },
    ]);
    await expect(runStorageCleanup({ now, apply: true })).rejects.toThrow(
      "Unrecognized storage references"
    );
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(
      await prisma.student.findUniqueOrThrow({ where: { id: expiring.id } })
    ).toMatchObject({ cv: expiring.cv, cvPurgedAt: null });
    expect(
      (
        await prisma.storageDeletion.findUniqueOrThrow({
          where: { kind_key: { kind: "cv", key: pending.key } },
        })
      ).attempts
    ).toBe(0);
  }
);

test("known logo-bucket and local asset references do not block avatar cleanup", async () => {
  const avatar = newKey("avatar");
  const company = await fixtures.company();
  await prisma.company.update({
    where: { id: company.id },
    data: { avatar: `/api/media/logo/${randomUUID()}` },
  });
  const sponsor = await prisma.sponsor.create({
    data: {
      name: randomUUID(),
      logo: "/assets/images/sponsors/legacy.png?token=%2f#image",
      order: 402,
    },
  });
  sponsorIds.push(sponsor.id);
  const plan = await planStorageCleanup(
    now,
    [{ kind: "avatar", key: avatar.key }],
    true
  );
  expect(plan.orphans).toEqual([{ kind: "avatar", key: avatar.key }]);
  expect(
    (await planStorageCleanup(now, [{ kind: "avatar", key: avatar.key }], true))
      .orphans
  ).toEqual([]);
});

test.each([
  "/assets/../api/media/avatar/./",
  "/assets/%2e%2e/api/media/avatar/./",
  "/assets/..%2fapi/media/avatar/./",
  "/assets/../api/media/avatar/%30",
  "/assets/..\\api/media/avatar/./",
  "/assets/..\t/api/media/avatar/./",
])(
  "ambiguous path %s stops cleanup and cannot bypass attachment guards",
  async (prefix) => {
    const avatar = newKey("avatar");
    const alias = prefix + avatar.id;
    const company = await fixtures.company();
    // Model a legacy value, atomically restoring the guard before other writes.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`ALTER TABLE "Company" DISABLE TRIGGER company_avatar_storage_guard`;
      await tx.company.update({
        where: { id: company.id },
        data: { avatar: alias },
      });
      await tx.$executeRaw`ALTER TABLE "Company" ENABLE TRIGGER company_avatar_storage_guard`;
    });
    for (const apply of [false, true]) {
      const plan = await planStorageCleanup(
        now,
        [{ kind: "avatar", key: avatar.key }],
        apply
      );
      expect(plan.unknownReference).toBeGreaterThanOrEqual(1);
      expect(plan.orphans).toEqual([]);
      expect(
        await prisma.storageDeletion.count({ where: { key: avatar.key } })
      ).toBe(0);
    }
    await prisma.company.update({
      where: { id: company.id },
      data: { avatar: null },
    });
    await planStorageCleanup(now, [{ kind: "avatar", key: avatar.key }], true);
    const student = await fixtures.student();
    for (const update of [
      prisma.company.update({
        where: { id: company.id },
        data: { avatar: alias },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { avatar: alias },
      }),
      prisma.student.update({ where: { id: student.id }, data: { cv: alias } }),
      prisma.sponsor.create({
        data: { name: randomUUID(), logo: alias, order: 402 },
      }),
    ])
      await expect(update).rejects.toThrow("Ambiguous storage reference path");
  }
);

test("case-insensitive guard has an index matching its predicate", async () => {
  const indexes = await prisma.$queryRaw<{ indexdef: string }[]>`
    SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema()
    AND tablename = 'StorageDeletion'`;
  expect(
    indexes.some(({ indexdef }) => indexdef.includes("(kind, lower(key))"))
  ).toBe(true);
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

test("invalid queue keys record failure without starving valid deletions", async () => {
  const invalid = `https://private.invalid/${randomUUID()}?token=hidden`;
  const cv = newKey("cv");
  keys.push(invalid);
  await prisma.storageDeletion.createMany({
    data: [
      { kind: "cv", key: invalid },
      { kind: "cv", key: cv.key },
    ],
  });
  const audit = vi.fn();
  const result = await runStorageCleanup({ now, apply: true, audit });
  expect(result).toMatchObject({ failed: 1, deleted: 1 });
  expect(storage.deleteObject).toHaveBeenCalledExactlyOnceWith(
    "cv",
    cv.key,
    undefined
  );
  expect(
    await prisma.storageDeletion.findUniqueOrThrow({
      where: { kind_key: { kind: "cv", key: invalid } },
    })
  ).toMatchObject({
    attempts: 1,
    lastError: "InvalidCleanupQueueEntry",
    deletedAt: null,
    quarantinedAt: now,
  });
  expect((await runStorageCleanup({ now, apply: true })).failed).toBe(0);
  expect(JSON.stringify(audit.mock.calls)).not.toContain("token=hidden");
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

test.each(["cv", "avatar"] as const)(
  "tombstoned %s attachment returns a sanitized 409",
  async (kind) => {
    const object = newKey(kind);
    const student = await fixtures.student();
    await prisma.storageDeletion.create({ data: { kind, key: object.key } });
    let error: unknown;
    try {
      await prisma.student.update({
        where: { id: student.id },
        data: { [kind]: object.id },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeDefined();
    const response = httpErrorResponse(error);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Storage object is queued for deletion; upload a new file",
    });
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: student.id } }))[
        kind
      ]
    ).toBeNull();
  }
);

test("ambiguous attachment returns a sanitized 400", async () => {
  const avatar = newKey("avatar");
  const student = await fixtures.student();
  let error: unknown;
  try {
    await prisma.student.update({
      where: { id: student.id },
      data: { avatar: `/api/media/avatar/../avatar/${avatar.id}` },
    });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeDefined();
  const response = httpErrorResponse(error);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "Ambiguous storage reference path; use a canonical URL",
  });
});

test("five-second lock timeout leaves references and claims unchanged", async () => {
  const cv = newKey("cv");
  const student = await studentCv(cv.id, old);
  let locked!: () => void;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blocker = prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`LOCK TABLE "Student" IN ROW EXCLUSIVE MODE`;
      locked();
      await proceed;
    },
    { timeout: 15_000 }
  );
  await ready;
  const started = Date.now();
  try {
    await expect(
      planStorageCleanup(now, [{ kind: "cv", key: cv.key }], true)
    ).rejects.toThrow(/lock timeout/);
    expect(Date.now() - started).toBeLessThan(9000);
  } finally {
    release();
    await blocker;
  }
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: student.id } })).cv
  ).toBe(cv.id);
  expect(await prisma.storageDeletion.count({ where: { key: cv.key } })).toBe(
    0
  );
});
