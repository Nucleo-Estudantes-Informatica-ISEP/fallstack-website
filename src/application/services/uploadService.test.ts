// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { deleteObject, putObjectStream } from "./objectStorageService";
import { readUploadFile, uploadFile } from "./uploadService";

vi.mock("server-only", () => ({}));
vi.mock("./objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  logoKey: (id: string) => `distribution/logo/${id}`,
  publicAvatarUrl: (id: string) => `/api/media/avatar/${id}`,
  publicLogoUrl: (id: string) => `/api/media/logo/${id}`,
  putObjectStream: vi.fn(),
  deleteObject: vi.fn(),
}));

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function makePng(extraBytes = 0) {
  const bytes = new Uint8Array(PNG_HEADER.length + extraBytes);
  bytes.set(PNG_HEADER);
  return new File([bytes], "image.png", { type: "image/png" });
}

function makePdf(sizeBytes = 16) {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set(PDF_HEADER);
  return new File([bytes], "cv.pdf", { type: "application/pdf" });
}

beforeEach(() => {
  vi.mocked(putObjectStream).mockResolvedValue(undefined as never);
  vi.mocked(deleteObject).mockResolvedValue(undefined as never);
});

// ─── readUploadFile ───────────────────────────────────────────────────────────

test("rejects oversized multipart body before parsing it (Content-Length)", async () => {
  const request = new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: Buffer.alloc(10),
    headers: {
      "Content-Type": "multipart/form-data; boundary=x",
      "Content-Length": String(10 * 1024 * 1024 + 16 * 1024 + 1),
    },
  });
  await expect(readUploadFile(request, "cv")).rejects.toMatchObject({
    status: 413,
  });
});

test("rejects invalid non-numeric Content-Length as oversized/invalid", async () => {
  const request = new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: Buffer.alloc(10),
    headers: {
      "Content-Type": "multipart/form-data; boundary=x",
      "Content-Length": "not-a-number",
    },
  });
  await expect(readUploadFile(request, "cv")).rejects.toMatchObject({
    status: 413,
  });
});

test("rejects oversized body mid-stream when Content-Length is missing or smaller", async () => {
  const maxBodySize = 10 * 1024 * 1024 + 16 * 1024;
  const oversizedBytes = new Uint8Array(maxBodySize + 100);
  const form = new FormData();
  form.append("file", new Blob([oversizedBytes], { type: "application/pdf" }));
  const req = new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: form,
  });
  // Strip Content-Length so the server must count bytes in flight
  const stripped = new Request(req.url, {
    method: "POST",
    headers: new Headers(
      [...req.headers.entries()].filter(
        ([k]) => k.toLowerCase() !== "content-length"
      )
    ),
    body: req.body,
    // @ts-expect-error duplex is needed for streaming body
    duplex: "half",
  });
  await expect(readUploadFile(stripped, "cv")).rejects.toMatchObject({
    status: 413,
  });
});

test("rejects a request with no body", async () => {
  const request = new Request("http://localhost/api/storage/cv", {
    method: "POST",
  });
  await expect(readUploadFile(request, "cv")).rejects.toMatchObject({
    status: 400,
  });
});

test("returns the File from a valid multipart request", async () => {
  const form = new FormData();
  form.append(
    "file",
    new File(["bytes"], "f.pdf", { type: "application/pdf" })
  );
  const request = new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: form,
  });
  const file = await readUploadFile(request, "cv");
  expect(file).toBeInstanceOf(File);
  expect(file.type).toBe("application/pdf");
});

// ─── uploadFile ───────────────────────────────────────────────────────────────

test("rejects unknown content type before touching storage", async () => {
  const file = new File(["data"], "f.exe", {
    type: "application/x-msdownload",
  });
  await expect(uploadFile("avatar", file)).rejects.toMatchObject({
    status: 400,
  });
  expect(putObjectStream).not.toHaveBeenCalled();
});

test("rejects an oversized file before touching storage", async () => {
  const oversized = Object.defineProperty(
    new File([PNG_HEADER], "big.png", { type: "image/png" }),
    "size",
    { value: 5 * 1024 * 1024 + 1 }
  );
  await expect(uploadFile("avatar", oversized)).rejects.toMatchObject({
    status: 400,
  });
  expect(putObjectStream).not.toHaveBeenCalled();
});

test("rejects a file whose leading bytes do not match its declared type", async () => {
  const bad = new File(["bad"], "bad.png", { type: "image/png" });
  await expect(uploadFile("avatar", bad)).rejects.toMatchObject({
    status: 400,
  });
  expect(putObjectStream).not.toHaveBeenCalled();
});

test("streams a valid PNG avatar to storage and returns id+url", async () => {
  const file = makePng();
  const result = await uploadFile("avatar", file);
  expect(result).toEqual({
    id: expect.any(String),
    url: expect.stringMatching(/^\/api\/media\/avatar\//),
  });
  expect(putObjectStream).toHaveBeenCalledWith(
    "avatar",
    expect.stringMatching(/^distribution\/avatar\//),
    expect.objectContaining({ pipe: expect.any(Function) }),
    "image/png",
    file.size
  );
  expect(deleteObject).not.toHaveBeenCalled();
});

test("streams a valid PDF CV to storage and returns only id (no public URL)", async () => {
  const file = makePdf(64);
  const result = await uploadFile("cv", file);
  expect(result).toEqual({ id: expect.any(String) });
  expect("url" in result).toBe(false);
  expect(putObjectStream).toHaveBeenCalledWith(
    "cv",
    expect.stringMatching(/^distribution\/cv\/.+\.pdf$/),
    expect.objectContaining({ pipe: expect.any(Function) }),
    "application/pdf",
    file.size
  );
});

test("deletes the orphaned key and re-throws when the storage PUT fails", async () => {
  const file = makePng();
  const storageError = new Error("MinIO unavailable");
  vi.mocked(putObjectStream).mockRejectedValueOnce(storageError);
  await expect(uploadFile("avatar", file)).rejects.toBe(storageError);
  await Promise.resolve();
  expect(deleteObject).toHaveBeenCalledWith(
    "avatar",
    expect.stringMatching(/^distribution\/avatar\//)
  );
});

test("swallows the cleanup error when both upload and delete fail", async () => {
  const file = makePng();
  vi.mocked(putObjectStream).mockRejectedValueOnce(new Error("upload failed"));
  vi.mocked(deleteObject).mockRejectedValueOnce(new Error("delete failed"));
  await expect(uploadFile("avatar", file)).rejects.toMatchObject({
    message: "upload failed",
  });
});
