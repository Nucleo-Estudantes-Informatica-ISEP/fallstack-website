import { beforeEach, expect, test, vi } from "vitest";

import { createAdminClient } from "@/utils/supabase/admin";

import { deleteStorageObject } from "./storageAdminService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const remove = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminClient).mockReturnValue({
    storage: { from: () => ({ remove }) },
  } as never);
  remove.mockResolvedValue({ error: null });
});

test("removes a legitimate avatar object by its plain uuid name", async () => {
  await deleteStorageObject("avatar", "3fa85f64-5717-4562-b3fc-2c963f66afa6");

  expect(remove).toHaveBeenCalledWith([
    "distribution/avatar/3fa85f64-5717-4562-b3fc-2c963f66afa6",
  ]);
});

test("removes a legitimate cv object with its .pdf suffix", async () => {
  await deleteStorageObject("cv", "3fa85f64-5717-4562-b3fc-2c963f66afa6.pdf");

  expect(remove).toHaveBeenCalledWith([
    "distribution/cv/3fa85f64-5717-4562-b3fc-2c963f66afa6.pdf",
  ]);
});

test("rejects a name containing a path separator instead of building the object key", async () => {
  await expect(
    deleteStorageObject("cv", "../../avatar/some-other-file")
  ).rejects.toThrow("Invalid file name");

  expect(remove).not.toHaveBeenCalled();
});

test("rejects a name that is just parent-directory segments", async () => {
  await expect(deleteStorageObject("avatar", "..")).rejects.toThrow(
    "Invalid file name"
  );

  expect(remove).not.toHaveBeenCalled();
});
