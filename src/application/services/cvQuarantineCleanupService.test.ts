import { beforeEach, expect, test, vi } from "vitest";

import {
  cleanupCvQuarantine,
  listExpiredCvQuarantine,
} from "./cvQuarantineCleanupService";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  listObjects: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock("./objectStorageService", () => mocks);

const now = new Date("2026-11-15T12:00:00.000Z");
const validUuid = "00000000-0000-4000-8000-000000000001";
const validKey = `quarantine/cv/${validUuid}`;

beforeEach(() => {
  vi.resetAllMocks();
});

test("filters by key regex: only quarantine/cv/<uuid> keys match", async () => {
  const expiredDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  mocks.listObjects.mockResolvedValue([
    { Key: validKey, LastModified: expiredDate },
    { Key: "quarantine/cv/invalid-uuid", LastModified: expiredDate },
    { Key: `${validKey}.pdf`, LastModified: expiredDate },
    { Key: `distribution/cv/${validUuid}`, LastModified: expiredDate },
    { Key: `${validKey}/extra`, LastModified: expiredDate },
    { Key: undefined, LastModified: expiredDate },
  ]);

  const expired = await listExpiredCvQuarantine(now);
  expect(expired).toEqual([validKey]);
  expect(mocks.listObjects).toHaveBeenCalledWith("cv", "quarantine/cv", undefined);
});

test("enforces 24h cutoff: objects newer than 24h or missing LastModified are ignored", async () => {
  const olderThan24h = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1000);
  const newerThan24h = new Date(now.getTime() - 24 * 60 * 60 * 1000 + 1000);
  const key2 = `quarantine/cv/00000000-0000-4000-8000-000000000002`;
  const key3 = `quarantine/cv/00000000-0000-4000-8000-000000000003`;

  mocks.listObjects.mockResolvedValue([
    { Key: validKey, LastModified: olderThan24h },
    { Key: key2, LastModified: newerThan24h },
    { Key: key3, LastModified: undefined },
  ]);

  const expired = await listExpiredCvQuarantine(now);
  expect(expired).toEqual([validKey]);
});

test("dry-run mode does not delete any objects and returns matched count", async () => {
  const expiredDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  mocks.listObjects.mockResolvedValue([
    { Key: validKey, LastModified: expiredDate },
  ]);

  const count = await cleanupCvQuarantine(now, false);
  expect(count).toBe(1);
  expect(mocks.deleteObject).not.toHaveBeenCalled();
});

test("apply mode continues deletion loop on individual delete failures and returns deleted count", async () => {
  const expiredDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  const key2 = `quarantine/cv/00000000-0000-4000-8000-000000000002`;
  mocks.listObjects.mockResolvedValue([
    { Key: validKey, LastModified: expiredDate },
    { Key: key2, LastModified: expiredDate },
  ]);

  mocks.deleteObject
    .mockRejectedValueOnce(new Error("Transient S3 failure"))
    .mockResolvedValueOnce(undefined);

  const deleted = await cleanupCvQuarantine(now, true);
  expect(deleted).toBe(1);
  expect(mocks.deleteObject).toHaveBeenCalledTimes(2);
  expect(mocks.deleteObject).toHaveBeenNthCalledWith(1, "cv", validKey, undefined);
  expect(mocks.deleteObject).toHaveBeenNthCalledWith(2, "cv", key2, undefined);
});

test("aborted signal interrupts deletion loop and rethrows abort error", async () => {
  const controller = new AbortController();
  const expiredDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  const key2 = `quarantine/cv/00000000-0000-4000-8000-000000000002`;
  mocks.listObjects.mockResolvedValue([
    { Key: validKey, LastModified: expiredDate },
    { Key: key2, LastModified: expiredDate },
  ]);

  mocks.deleteObject.mockImplementationOnce(async () => {
    controller.abort();
    throw controller.signal.reason;
  });

  await expect(
    cleanupCvQuarantine(now, true, controller.signal)
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(mocks.deleteObject).toHaveBeenCalledTimes(1);
});
