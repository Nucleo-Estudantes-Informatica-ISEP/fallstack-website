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
  });
  mocks.pendingStorageDeletions.mockResolvedValue([{ kind: "cv", key }]);
});

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
