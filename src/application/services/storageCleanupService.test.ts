import { beforeEach, expect, test, vi } from "vitest";

import { runStorageCleanup } from "./storageCleanupService";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  planStorageCleanup: vi.fn(),
  pendingStorageDeletions: vi.fn(),
  recordStorageDeletion: vi.fn(),
  listObjects: vi.fn(),
  deleteObject: vi.fn(),
  assertUnversionedBucket: vi.fn(),
}));
vi.mock("../repositories/storageCleanupRepository", () => mocks);
vi.mock("./objectStorageService", () => mocks);
const key = "distribution/cv/00000000-0000-4000-8000-000000000001.pdf";
const now = new Date("2026-10-08T03:00:00Z");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.listObjects.mockResolvedValue([]);
  mocks.planStorageCleanup.mockResolvedValue({
    expired: [],
    orphans: [],
    unknownAge: 0,
    unknownReference: 0,
  });
  mocks.pendingStorageDeletions.mockResolvedValue([{ kind: "cv", key }]);
});

test("shutdown stops the batch after acknowledging the current deletion", async () => {
  const controller = new AbortController();
  mocks.pendingStorageDeletions.mockResolvedValue([
    { kind: "cv", key },
    { kind: "cv", key: key.replace("001.pdf", "002.pdf") },
  ]);
  mocks.deleteObject.mockImplementationOnce(async () => controller.abort());
  await expect(
    runStorageCleanup({ now, apply: true, signal: controller.signal })
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(mocks.deleteObject).toHaveBeenCalledTimes(1);
  expect(mocks.recordStorageDeletion).toHaveBeenCalledWith(
    "cv",
    key,
    now,
    null
  );
});

test("an aborted S3 request leaves its durable claim pending without recording a failure", async () => {
  const controller = new AbortController();
  mocks.deleteObject.mockImplementationOnce(async () => {
    controller.abort();
    throw controller.signal.reason;
  });
  await expect(
    runStorageCleanup({ now, apply: true, signal: controller.signal })
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(mocks.deleteObject).toHaveBeenCalledWith("cv", key, controller.signal);
  expect(mocks.recordStorageDeletion).not.toHaveBeenCalled();
});

test("unknown references are warned without exposing their raw value", async () => {
  const audit = vi.fn();
  mocks.planStorageCleanup.mockResolvedValue({
    expired: [],
    orphans: [],
    unknownAge: 0,
    unknownReference: 1,
  });
  await runStorageCleanup({ now, audit });
  expect(audit).toHaveBeenCalledWith({
    level: "warn",
    action: "unknown-cv-reference",
    count: 1,
  });
});

test.each([false, true])(
  "invalid queue entries fail safely even in dry run (apply=%s)",
  async (apply) => {
    const audit = vi.fn();
    for (const row of [
      { kind: "logo", key },
      { kind: "cv", key: "https://private.invalid/file?token=secret" },
    ]) {
      mocks.pendingStorageDeletions.mockResolvedValue([row]);
      await expect(runStorageCleanup({ now, apply, audit })).rejects.toThrow(
        "Invalid cleanup queue"
      );
    }
    expect(audit).not.toHaveBeenCalled();
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  }
);

test("default dry run never deletes, queues, or records attempts", async () => {
  await runStorageCleanup({ now });
  expect(mocks.planStorageCleanup).toHaveBeenCalledWith(now, [], false);
  expect(mocks.deleteObject).not.toHaveBeenCalled();
  expect(mocks.recordStorageDeletion).not.toHaveBeenCalled();
});

test("only scoped UUID objects older than 48 hours become candidates", async () => {
  mocks.listObjects.mockImplementation(async (kind: string) =>
    kind === "cv"
      ? [
          { Key: key, LastModified: new Date("2026-10-06T02:59:59Z") },
          {
            Key: key.replace("001.pdf", "002.pdf"),
            LastModified: new Date("2026-10-06T03:00:00Z"),
          },
          { Key: key.replace("001.pdf", "003.pdf") },
          { Key: "distribution/cv/manual.pdf", LastModified: new Date(0) },
          { Key: "outside/scope.pdf", LastModified: new Date(0) },
        ]
      : []
  );
  await runStorageCleanup({ now });
  expect(mocks.planStorageCleanup).toHaveBeenCalledWith(
    now,
    [{ kind: "cv", key }],
    false
  );
});

test("failed deletes remain pending; next run retries and records success", async () => {
  mocks.deleteObject.mockRejectedValueOnce(
    new Error("do not log sensitive message")
  );
  expect((await runStorageCleanup({ now, apply: true })).failed).toBe(1);
  expect(mocks.recordStorageDeletion).toHaveBeenLastCalledWith(
    "cv",
    key,
    now,
    "Error"
  );
  mocks.deleteObject.mockResolvedValueOnce(undefined);
  expect((await runStorageCleanup({ now, apply: true })).deleted).toBe(1);
  expect(mocks.recordStorageDeletion).toHaveBeenLastCalledWith(
    "cv",
    key,
    now,
    null
  );
});

test("versioned buckets fail before changing DB or deleting objects", async () => {
  mocks.assertUnversionedBucket.mockRejectedValueOnce(
    new Error("Versioned bucket")
  );
  await expect(runStorageCleanup({ now, apply: true })).rejects.toThrow(
    "Versioned bucket"
  );
  expect(mocks.planStorageCleanup).not.toHaveBeenCalled();
  expect(mocks.deleteObject).not.toHaveBeenCalled();
});

test("partial listing failures abort before any DB writes or S3 deletes", async () => {
  mocks.listObjects
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error("List failed"));
  await expect(runStorageCleanup({ now, apply: true })).rejects.toThrow(
    "List failed"
  );
  expect(mocks.planStorageCleanup).not.toHaveBeenCalled();
  expect(mocks.deleteObject).not.toHaveBeenCalled();
});
