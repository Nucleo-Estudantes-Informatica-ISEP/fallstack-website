// @vitest-environment node
import type { ReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import config from "@/config";

import { deleteObject, putObjectStream } from "./objectStorageService";
import { uploadFile } from "./uploadService";

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

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
const PDF = Buffer.from("%PDF-1.7\n%%EOF\n");
let stored: Buffer;
let stagedPath: string;

function request(bytes = PDF, type = "application/pdf", signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "upload", { type }));
  return new Request("http://localhost/api/storage/cv", {
    method: "POST",
    body: form,
    signal,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  stagedPath = "";
  vi.mocked(deleteObject).mockResolvedValue(undefined);
  vi.mocked(putObjectStream).mockImplementation(async (_kind, _key, stream) => {
    stagedPath = String((stream as ReadStream).path);
    // Windows does not expose POSIX permission bits through stat().
    if (process.platform !== "win32")
      expect((await stat(stagedPath)).mode & 0o777).toBe(0o600);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    stored = Buffer.concat(chunks);
  });
});

afterEach(async () => {
  if (stagedPath)
    await expect(access(stagedPath)).rejects.toMatchObject({ code: "ENOENT" });
});

test.each([
  ["avatar", PNG, "image/png"],
  ["avatar", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg"],
  ["logo", Buffer.from("RIFF0000WEBP"), "image/webp"],
  ["cv", PDF, "application/pdf"],
] as const)(
  "stores exact validated bytes for %s/%s/%s",
  async (kind, bytes, type) => {
    const result = await uploadFile(kind, request(bytes, type));
    expect(stored.equals(bytes)).toBe(true);
    expect(result).toMatchObject({
      id: expect.any(String),
      size: bytes.length,
      contentType: type,
    });
    expect(result.url).toBe(
      kind === "cv" ? undefined : `/api/media/${kind}/${result.id}`
    );
    expect(putObjectStream).toHaveBeenCalledWith(
      kind,
      expect.any(String),
      expect.anything(),
      type,
      bytes.length,
      expect.any(AbortSignal)
    );
    expect(deleteObject).not.toHaveBeenCalled();
  }
);

test.each(["cv", "avatar"] as const)(
  "accepts an exact-limit %s without whole-body parsing",
  async (kind) => {
    const bytes = Buffer.alloc(config.uploads[kind].maxSize);
    (kind === "cv" ? PDF : PNG).copy(bytes);
    const req = request(bytes, kind === "cv" ? "application/pdf" : "image/png");
    vi.spyOn(req, "formData").mockRejectedValue(
      new Error("Whole-body parsing is forbidden")
    );
    await uploadFile(kind, req);
    expect(stored.equals(bytes)).toBe(true);
    expect(req.formData).not.toHaveBeenCalled();
  }
);

test.each([
  [Buffer.from("data"), "application/x-msdownload"],
  [Buffer.from("spoofed"), "application/pdf"],
  [Buffer.from("%PD"), "application/pdf"],
  [PNG, "image/webp"],
])("rejects invalid type/signature before storage", async (bytes, type) => {
  await expect(uploadFile("cv", request(bytes, type))).rejects.toMatchObject({
    status: 400,
  });
  expect(putObjectStream).not.toHaveBeenCalled();
});

test("waits for cleanup after storage failure and closes the file stream", async () => {
  const failure = new Error("MinIO unavailable");
  vi.mocked(putObjectStream).mockImplementationOnce(
    async (_kind, _key, body) => {
      stagedPath = String((body as ReadStream).path);
      for await (const chunk of body) {
        expect(chunk.length).toBeGreaterThan(0);
        break;
      }
      throw failure;
    }
  );
  await expect(uploadFile("cv", request())).rejects.toBe(failure);
  const call = vi.mocked(putObjectStream).mock.calls[0];
  expect(call[2].destroyed).toBe(true);
  expect(deleteObject).toHaveBeenCalledWith(
    "cv",
    call[1],
    expect.any(AbortSignal)
  );
});

test("retains the PUT error when orphan cleanup also fails", async () => {
  const failure = new Error("upload failed");
  vi.mocked(putObjectStream).mockRejectedValueOnce(failure);
  vi.mocked(deleteObject).mockRejectedValueOnce(new Error("delete failed"));
  await expect(uploadFile("avatar", request(PNG, "image/png"))).rejects.toBe(
    failure
  );
});

test("aborts storage on request disconnect and never returns an id", async () => {
  const controller = new AbortController();
  vi.mocked(putObjectStream).mockImplementationOnce(
    async (_kind, _key, body, _type, _size, signal) => {
      stagedPath = String((body as ReadStream).path);
      controller.abort();
      signal!.throwIfAborted();
    }
  );
  await expect(
    uploadFile("cv", request(PDF, "application/pdf", controller.signal))
  ).rejects.toMatchObject({ status: 400 });
  expect(deleteObject).toHaveBeenCalledTimes(1);
});

test("rejects SVG that grows beyond the limit after sanitization", async () => {
  const prefix =
    '<svg xmlns="http://www.w3.org/2000/svg">' + "<path/>".repeat(9000);
  const suffix = "</svg>";
  const source = Buffer.from(
    prefix +
      "a".repeat(config.uploads.logo.maxSize - prefix.length - suffix.length) +
      suffix
  );
  await expect(
    uploadFile("logo", request(source, "image/svg+xml"))
  ).rejects.toMatchObject({ status: 400 });
  expect(putObjectStream).not.toHaveBeenCalled();
});
