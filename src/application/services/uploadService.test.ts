import { expect, test, vi } from "vitest";

import { putObject } from "./objectStorageService";
import { readUploadFile, uploadFile } from "./uploadService";

vi.mock("server-only", () => ({}));
vi.mock("./objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  publicAvatarUrl: (id: string) => `/api/media/avatar/${id}`,
  putObject: vi.fn(),
}));

test("rejects oversized multipart body before parsing it", async () => {
  const request = new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: Buffer.alloc(10 * 1024 * 1024 + 16 * 1024 + 1),
  });
  await expect(readUploadFile(request, "cv")).rejects.toMatchObject({
    status: 413,
  });
});

test("validates signature and stores original content type", async () => {
  const image = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])],
    "image.png",
    { type: "image/png" }
  );
  const result = await uploadFile("avatar", image);
  expect(result).toEqual({
    id: expect.any(String),
    url: expect.stringMatching(/^\/api\/media\/avatar\//),
  });
  expect(putObject).toHaveBeenCalledWith(
    "avatar",
    expect.stringMatching(/^distribution\/avatar\//),
    expect.any(Uint8Array),
    "image/png"
  );
  await expect(
    uploadFile("avatar", new File(["bad"], "bad.png", { type: "image/png" }))
  ).rejects.toMatchObject({ status: 400 });
});
