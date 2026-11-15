// @vitest-environment node
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import prisma from "@/application/repositories/database";

import { syntheticPdf } from "../fixtures/pdf";
import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/application/services/sessionService", () => ({
  default: () => auth.session,
}));
vi.mock("@/application/services/uploadService", () => ({
  checkUploadRateLimit: async () => ({ status: "allowed" }),
}));

// Explicit disposable target. CI must opt in; never silently use .env storage.
const enabled = !!process.env.TEST_MINIO_ENDPOINT;
if (process.env.CI && !enabled)
  throw new Error("CI requires TEST_MINIO_ENDPOINT");
const fixtures = databaseFixtures(prisma);
const bucket = `direct-cv-${randomUUID()}`;
let client: S3Client;
let owner: Awaited<ReturnType<typeof fixtures.student>>;
let other: Awaited<ReturnType<typeof fixtures.student>>;
let service: typeof import("@/application/services/directCvUploadService");
let storage: typeof import("@/application/services/objectStorageService");
let initiate: typeof import("@/app/api/storage/cv/route");
let finalize: typeof import("@/app/api/storage/cv/finalize/route");
const pdf = syntheticPdf();
const context = { params: Promise.resolve({}) };
function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/storage/cv${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function session(user = owner) {
  auth.session = {
    id: user.id,
    role: "STUDENT",
    student: user,
    employee: null,
    adminRole: null,
  };
}
async function ticket(size = pdf.length) {
  session();
  const response = await initiate.POST(
    request("", { filename: "cv.pdf", contentType: "application/pdf", size }),
    context
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    uploadId: string;
    url: string;
    fields: Record<string, string>;
  };
}
async function transfer(
  post: { url: string; fields: Record<string, string> },
  bytes = pdf,
  extra: Record<string, string> = {}
) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...post.fields, ...extra }))
    form.append(key, value);
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    "cv.pdf"
  );
  return fetch(post.url, { method: "POST", body: form, redirect: "error" });
}
async function finish(uploadId: string) {
  return finalize.POST(request("/finalize", { uploadId }), context);
}

beforeAll(async () => {
  if (!enabled) return;
  const endpoint = new URL(process.env.TEST_MINIO_ENDPOINT!);
  if (
    !["127.0.0.1", "localhost"].includes(endpoint.hostname) ||
    process.env.CONFIRM_LOCAL_STORAGE_TEST !== "yes"
  )
    throw new Error("Use a confirmed loopback disposable MinIO");
  process.env.S3_ENDPOINT = endpoint.origin;
  process.env.S3_PUBLIC_ENDPOINT = endpoint.origin;
  process.env.S3_ACCESS_KEY_ID = process.env.TEST_MINIO_ACCESS_KEY!;
  process.env.S3_SECRET_ACCESS_KEY = process.env.TEST_MINIO_SECRET_KEY!;
  process.env.S3_BUCKET_CVS = bucket;
  client = new S3Client({
    endpoint: endpoint.origin,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  const { CreateBucketCommand } = await import("@aws-sdk/client-s3");
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  owner = await fixtures.student();
  other = await fixtures.student();
  service = await import("@/application/services/directCvUploadService");
  storage = await import("@/application/services/objectStorageService");
  initiate = await import("@/app/api/storage/cv/route");
  finalize = await import("@/app/api/storage/cv/finalize/route");
});
afterAll(async () => {
  if (enabled && client) {
    const { Contents } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );
    if (Contents?.length)
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: Contents.map(({ Key }) => ({ Key })) },
        })
      );
    const { DeleteBucketCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    await fixtures.cleanup();
    client.destroy();
  }
  await prisma.$disconnect();
});

test.skipIf(!enabled)(
  "authenticated direct POST → conditional promotion → profile → private byte-identical download; replay is harmless",
  async () => {
    const post = await ticket();
    const policy = JSON.parse(
      Buffer.from(post.fields.Policy, "base64").toString()
    );
    expect(policy.conditions).toContainEqual([
      "content-length-range",
      pdf.length,
      pdf.length,
    ]);
    expect(
      new Date(policy.expiration).getTime() - Date.now()
    ).toBeLessThanOrEqual(300_000);
    expect(JSON.stringify(post)).not.toContain(
      process.env.S3_SECRET_ACCESS_KEY
    );
    expect(post.fields.key).toBe(`quarantine/cv/${post.uploadId}`);
    expect((await transfer(post)).status).toBe(204);
    session();
    const completed = await finish(post.uploadId);
    expect(completed.status).toBe(200);
    const { id } = await completed.json();
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(id);
    const { downloadStudentCv, setStudentCv } =
      await import("@/application/services/studentService");
    expect(
      Buffer.from(
        (
          await downloadStudentCv(owner.code, {
            studentCode: owner.code,
            isAdmin: false,
          })
        ).bytes
      )
    ).toEqual(pdf);
    await expect(setStudentCv(other.code, id)).rejects.toMatchObject({
      status: 400,
    });
    await setStudentCv(owner.code, id); // Existing frontend compatibility, no retention reset.
    expect(await (await finish(post.uploadId)).json()).toEqual({ id });
    expect((await fetch(`${post.url}/${storage.cvKey(id)}`)).status).toBe(403);
    await expect(
      downloadStudentCv(owner.code, { studentCode: other.code, isAdmin: false })
    ).rejects.toMatchObject({ status: 404 });
    const altered = Buffer.from(pdf);
    altered[15] = 0x41;
    expect((await transfer(post, altered)).status).toBe(204); // Still-valid URL!
    expect(await (await finish(post.uploadId)).json()).toEqual({ id });
    expect(
      Buffer.from((await storage.getObject("cv", storage.cvKey(id)))!.bytes)
    ).toEqual(pdf);
  }
);

test.skipIf(!enabled)(
  "MinIO enforces actual size, exact key, MIME and expiration before publishing any object",
  async () => {
    const post = await ticket();
    for (const bytes of [
      Buffer.alloc(0),
      Buffer.alloc(pdf.length + 1),
      Buffer.alloc(10 * 1024 * 1024 + 1),
    ])
      expect((await transfer(post, bytes)).ok).toBe(false);
    await expect(
      client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: post.fields.key })
      )
    ).rejects.toMatchObject({ name: "NotFound" });
    expect(
      (await transfer(post, pdf, { key: storage.cvKey(randomUUID()) })).ok
    ).toBe(false);
    expect(
      (await transfer(post, pdf, { "Content-Type": "image/png" })).ok
    ).toBe(false);
    const expired = await createPresignedPost(client, {
      Bucket: bucket,
      Key: post.fields.key,
      Expires: -1,
      Conditions: [["content-length-range", pdf.length, pdf.length]],
    });
    expect((await transfer(expired)).ok).toBe(false);
    expect((await finish(post.uploadId)).status).toBe(409);
  }
);

test.skipIf(!enabled)(
  "allowed browser preflight succeeds and foreign origins receive no CORS grant",
  async () => {
    for (const [origin, allowed] of [
      ["http://localhost:3000", true],
      ["https://evil.example", false],
    ] as const) {
      const response = await fetch(
        `${process.env.TEST_MINIO_ENDPOINT}/${bucket}`,
        {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
          },
        }
      );
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        allowed ? origin : null
      );
      if (allowed) {
        expect(response.headers.get("access-control-allow-methods")).toBe(
          "POST"
        );
        expect(response.headers.get("access-control-allow-headers")).toBe(
          "content-type"
        );
      }
    }
  }
);

test.skipIf(!enabled)(
  "auth, ownership, missing id, metadata and legacy multipart fail closed",
  async () => {
    auth.session = null;
    expect((await initiate.POST(request("", {}), context)).status).toBe(401);
    const post = await ticket();
    session(other);
    expect((await finish(post.uploadId)).status).toBe(404);
    expect((await finish(randomUUID())).status).toBe(404);
    await expect(
      service.cancelCvUpload(other.id, post.uploadId)
    ).rejects.toMatchObject({ status: 404 });
    session();
    for (const body of [
      { filename: "cv.exe", contentType: "application/pdf", size: 20 },
      { filename: "cv.pdf", contentType: "image/png", size: 20 },
      { filename: "cv.pdf", contentType: "application/pdf", size: 0 },
      { filename: "cv.pdf", contentType: "application/pdf", size: 10485761 },
      {
        filename: "cv.pdf",
        contentType: "application/pdf",
        size: 20,
        ownerId: other.id,
      },
    ])
      expect((await initiate.POST(request("", body), context)).status).toBe(
        400
      );
    expect(
      (
        await initiate.POST(
          new NextRequest("http://localhost/api/storage/cv", {
            method: "POST",
            body: new FormData(),
          }),
          context
        )
      ).status
    ).toBe(415);
    await prisma.cvUpload.update({
      where: { id: post.uploadId },
      data: { expiresAt: new Date(0) },
    });
    expect((await finish(post.uploadId)).status).toBe(410);
  }
);

test.skipIf(!enabled)(
  "spoofed magic, truncation, empty object and stored MIME mismatch never attach",
  async () => {
    const initial = (
      await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })
    ).cv;
    for (const bytes of [
      Buffer.from("not a PDF\n%%EOF\n"),
      Buffer.from("%PDF-1.7\ntruncated"),
    ]) {
      const post = await ticket(bytes.length);
      expect((await transfer(post, bytes)).status).toBe(204);
      expect((await finish(post.uploadId)).status).toBe(400);
      expect((await finish(post.uploadId)).status).toBe(409);
    }
    for (const [body, type] of [
      [Buffer.alloc(0), "application/pdf"],
      [pdf, "image/png"],
    ] as const) {
      const post = await ticket();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: post.fields.key,
          Body: body,
          ContentType: type,
        })
      );
      expect((await finish(post.uploadId)).status).toBe(400);
    }
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(initial);
  }
);

test.skipIf(!enabled)(
  "ETag conditions refuse a change during range validation or promotion",
  async () => {
    const post = await ticket();
    await transfer(post);
    const head = await storage.headCvObject(
      post.fields.key,
      AbortSignal.timeout(5000)
    );
    const altered = Buffer.from(pdf);
    altered[15] = 0x42;
    await transfer(post, altered);
    await expect(
      storage.readCvRange(
        post.fields.key,
        0,
        15,
        head.ETag!,
        AbortSignal.timeout(5000)
      )
    ).rejects.toMatchObject({ name: "PreconditionFailed" });
    await expect(
      storage.promoteCvObject(
        post.fields.key,
        storage.cvKey(randomUUID()),
        head.ETag!,
        AbortSignal.timeout(5000)
      )
    ).rejects.toMatchObject({ name: "PreconditionFailed" });
  }
);

test.skipIf(!enabled)(
  "concurrent finalization has one committed destination; concurrent users stay isolated",
  async () => {
    const post = await ticket();
    await transfer(post);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.finalizeCvUpload(owner.id, post.uploadId)
      )
    );
    const ids = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value.id] : []
    );
    expect(new Set(ids).size).toBe(1);
    expect(ids.length).toBeGreaterThan(0);
    for (const result of results)
      if (result.status === "rejected") expect(result.reason.status).toBe(409);
    const posts = await Promise.all(
      [owner, owner, other].map((user) =>
        service.initiateCvUpload(user.id, {
          filename: "cv.pdf",
          contentType: "application/pdf",
          size: pdf.length,
        })
      )
    );
    await Promise.all(posts.map((p) => transfer(p)));
    const done = await Promise.all(
      posts.map((p, i) =>
        service.finalizeCvUpload(i === 2 ? other.id : owner.id, p.uploadId)
      )
    );
    expect(new Set(done.map((r) => r.id)).size).toBe(3);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: other.id } })).cv
    ).toBe(done[2].id);
  }
);

test.skipIf(!enabled)(
  "cancellation, abandoned and replayed temporaries are reclaimed independently of browser",
  async () => {
    const post = await ticket();
    await transfer(post);
    await service.cancelCvUpload(owner.id, post.uploadId);
    await service.cancelCvUpload(owner.id, post.uploadId);
    await transfer(post); // Recreate after cancel, signed URL cannot be revoked.
    expect((await finish(post.uploadId)).status).toBe(409);
    const { cleanupCvQuarantine } =
      await import("@/application/services/cvQuarantineCleanupService");
    const future = new Date(Date.now() + 86_400_001);
    expect(await cleanupCvQuarantine(future, false)).toBeGreaterThan(0);
    expect(await cleanupCvQuarantine(future, true)).toBeGreaterThan(0);
    await expect(
      client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: post.fields.key })
      )
    ).rejects.toMatchObject({ name: "NotFound" });
  }
);

test.skipIf(!enabled)(
  "signup upload stays unassociated until owner consumes it in profile transaction",
  async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `${randomUUID()}@example.test`,
        role: "STUDENT",
      },
    });
    try {
      const post = await service.initiateCvUpload(user.id, {
        filename: "cv.pdf",
        contentType: "application/pdf",
        size: pdf.length,
      });
      await transfer(post);
      const { id } = await service.finalizeCvUpload(user.id, post.uploadId);
      expect(
        (
          await prisma.cvUpload.findUniqueOrThrow({
            where: { id: post.uploadId },
          })
        ).status
      ).toBe("ready");
      const { createStudentProfile } =
        await import("@/application/services/studentService");
      await createStudentProfile(user.id, {
        name: "Synthetic signup",
        year: "1º Ano Licenciatura",
        course: "Test",
        privacyPolicyAccepted: true,
        termsAccepted: true,
        privacyPolicyVersion: "2026-10-31",
        termsVersion: "2026-11-11",
        interests: [],
        cvId: id,
      });
      expect(
        (await prisma.student.findUniqueOrThrow({ where: { id: user.id } })).cv
      ).toBe(id);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
);

test.skipIf(!enabled)(
  "DB association failure rolls back ticket and profile, then same authorization retries safely",
  async () => {
    const post = await ticket();
    await transfer(post);
    const previous = (
      await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })
    ).cv;
    const repository =
      await import("@/application/repositories/studentRepository");
    const failure = vi
      .spyOn(repository, "updateStudentMedia")
      .mockRejectedValueOnce(new Error("Synthetic database outage"));
    try {
      await expect(
        service.finalizeCvUpload(owner.id, post.uploadId)
      ).rejects.toMatchObject({ status: 503 });
    } finally {
      failure.mockRestore();
    }
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(previous);
    expect(
      (
        await prisma.cvUpload.findUniqueOrThrow({
          where: { id: post.uploadId },
        })
      ).status
    ).toBe("pending");
    const done = await service.finalizeCvUpload(owner.id, post.uploadId);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(done.id);
  }
);

test.skipIf(!enabled)(
  "crashed validator lease is fenced and cannot publish after a new attempt",
  async () => {
    const post = await ticket();
    await transfer(post);
    const repository =
      await import("@/application/repositories/cvUploadRepository");
    const stale = randomUUID();
    expect(
      await repository.claimCvUpload(post.uploadId, owner.id, stale, new Date())
    ).toBe(true);
    await prisma.cvUpload.update({
      where: { id: post.uploadId },
      data: { leaseUntil: new Date(0) },
    });
    const done = await service.finalizeCvUpload(owner.id, post.uploadId);
    await expect(
      prisma.$transaction((tx) =>
        repository.finishCvValidation(
          post.uploadId,
          owner.id,
          stale,
          randomUUID(),
          tx
        )
      )
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(done.id);
  }
);

test.skipIf(!enabled)(
  "reversed completion order: older finalizer cannot overwrite newer profile CV",
  async () => {
    const postA = await ticket();
    await new Promise((r) => setTimeout(r, 20));
    const postB = await ticket();

    await transfer(postA);
    await transfer(postB);

    // Finalize B first (the newer ticket)
    const doneB = await service.finalizeCvUpload(owner.id, postB.uploadId);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneB.id);

    // Finalize A second (the older ticket) out-of-order
    const doneA = await service.finalizeCvUpload(owner.id, postA.uploadId);
    expect(doneA.id).not.toBe(doneB.id);

    // Profile CV must remain B, fenced from older ticket A
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneB.id);
  }
);

test.skipIf(!enabled)(
  "equal timestamps in normal completion order: later ticket supersedes earlier ticket",
  async () => {
    const postA = await ticket();
    const postB = await ticket();

    const sharedTime = new Date("2026-11-15T12:00:00.000Z");
    await prisma.cvUpload.update({
      where: { id: postA.uploadId },
      data: { createdAt: sharedTime },
    });
    await prisma.cvUpload.update({
      where: { id: postB.uploadId },
      data: { createdAt: sharedTime },
    });

    await transfer(postA);
    await transfer(postB);

    // Finalize earlier ticket A first
    const doneA = await service.finalizeCvUpload(owner.id, postA.uploadId);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneA.id);

    // Finalize later ticket B second - replaces A despite equal timestamps
    const doneB = await service.finalizeCvUpload(owner.id, postB.uploadId);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneB.id);
  }
);

test.skipIf(!enabled)(
  "equal timestamps in reversed completion order: earlier finalizer cannot overwrite later ticket",
  async () => {
    const postA = await ticket();
    const postB = await ticket();

    const sharedTime = new Date("2026-11-15T12:00:00.000Z");
    await prisma.cvUpload.update({
      where: { id: postA.uploadId },
      data: { createdAt: sharedTime },
    });
    await prisma.cvUpload.update({
      where: { id: postB.uploadId },
      data: { createdAt: sharedTime },
    });

    await transfer(postA);
    await transfer(postB);

    // Finalize later ticket B first
    const doneB = await service.finalizeCvUpload(owner.id, postB.uploadId);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneB.id);

    // Finalize earlier ticket A second (out of order) - must not overwrite B
    const doneA = await service.finalizeCvUpload(owner.id, postA.uploadId);
    expect(doneA.id).not.toBe(doneB.id);
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: owner.id } })).cv
    ).toBe(doneB.id);
  }
);
