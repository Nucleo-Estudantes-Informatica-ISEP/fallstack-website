import { beforeEach, expect, test, vi } from "vitest";

import { deleteObject, listObjects } from "./objectStorageService";
import { deleteStorageObject, listStorageObjects } from "./storageAdminService";

vi.mock("server-only", () => ({}));
vi.mock("./objectStorageService", () => ({
  deleteObject: vi.fn(),
  getObject: vi.fn(),
  listObjects: vi.fn(),
  publicAvatarUrl: vi.fn((id: string) => `/api/media/avatar/${id}`),
}));

beforeEach(() => vi.clearAllMocks());

test("lists private CVs through admin route", async () => {
  vi.mocked(listObjects).mockResolvedValue([
    {
      Key: "distribution/cv/test.pdf",
      Size: 10,
      LastModified: new Date("2026-01-01"),
    },
  ]);
  const result = await listStorageObjects("cv", 1, 20);
  expect(result.items[0].url).toBe("/api/admin/storage/cv/test.pdf");
  expect(result.totalCount).toBe(1);
});

test("rejects traversal before deletion", async () => {
  await expect(deleteStorageObject("cv", "../test.pdf")).rejects.toThrow(
    "Invalid file name"
  );
  expect(deleteObject).not.toHaveBeenCalled();
});
