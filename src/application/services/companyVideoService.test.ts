// @vitest-environment node
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { beforeEach, expect, test, vi } from "vitest";

import { MAX_VIDEO_BYTES } from "@/domain/company/companyVideo";

import { hasPublicCompanyVideo } from "../repositories/companyRepository";
import {
  companyVideoResponse,
  uploadCompanyVideo,
} from "./companyVideoService";
import { getVideoObject, putVideoObject } from "./objectStorageService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  hasPublicCompanyVideo: vi.fn(),
}));
vi.mock("./objectStorageService", () => ({
  getVideoObject: vi.fn(),
  putVideoObject: vi.fn(),
}));
const header = Buffer.from(
  "00000018667479706d7034320000000069736f6d6d703432",
  "hex"
);
const id = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hasPublicCompanyVideo).mockResolvedValue(true);
});
function request(bytes: Uint8Array, type = "video/mp4") {
  return new Request("http://localhost/api/admin/storage/video", {
    method: "POST",
    headers: { "Content-Type": type },
    body: Buffer.from(bytes),
  });
}

test("spools validated MP4 to storage and removes temporary file", async () => {
  let path = "";
  vi.mocked(putVideoObject).mockImplementation(async (_id, p, size) => {
    path = p;
    expect(size).toBe(header.length);
    expect(await readFile(p)).toEqual(header);
  });
  expect(await uploadCompanyVideo(request(header))).toMatchObject({
    size: header.length,
    url: expect.stringMatching(/^\/api\/media\/video\//),
  });
  await expect(readFile(path)).rejects.toMatchObject({ code: "ENOENT" });
});

test("rejects forged MIME/signatures, oversized declared and chunked bodies without storing", async () => {
  const before = (await readdir(tmpdir())).filter((x) =>
    x.startsWith("fallstack-video-")
  );
  await expect(
    uploadCompanyVideo(request(header, "text/html"))
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    uploadCompanyVideo(request(Buffer.from("not an mp4")))
  ).rejects.toMatchObject({ status: 400 });
  const big = request(header);
  big.headers.set("content-length", String(MAX_VIDEO_BYTES + 1));
  await expect(uploadCompanyVideo(big)).rejects.toMatchObject({ status: 413 });
  // Reuse a small chunk to exceed the limit without allocating a full video buffer.
  const chunk = new Uint8Array(1024 * 1024);
  let remaining = 257;
  const stream = new ReadableStream({
    pull(c) {
      if (remaining--) c.enqueue(chunk);
      else c.close();
    },
  });
  const streamed = new Request("http://localhost/upload", {
    method: "POST",
    headers: { "Content-Type": "video/mp4" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  await expect(uploadCompanyVideo(streamed)).rejects.toMatchObject({
    status: 413,
  });
  expect(putVideoObject).not.toHaveBeenCalled();
  expect(
    (await readdir(tmpdir())).filter((x) => x.startsWith("fallstack-video-"))
  ).toEqual(before);
});

test("rejects incomplete and aborted uploads and removes temporary files", async () => {
  const incomplete = request(header);
  incomplete.headers.set("content-length", "1000");
  await expect(uploadCompanyVideo(incomplete)).rejects.toMatchObject({
    status: 400,
  });
  const controller = new AbortController();
  controller.abort();
  const aborted = new Request("http://localhost/upload", {
    method: "POST",
    headers: { "Content-Type": "video/mp4" },
    body: header,
    signal: controller.signal,
  });
  await expect(uploadCompanyVideo(aborted)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(putVideoObject).not.toHaveBeenCalled();
});

test("streams byte ranges with seek headers and supports HEAD", async () => {
  const body = () => ({
    transformToWebStream: () =>
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([1, 2, 3]));
          c.close();
        },
      }),
  });
  vi.mocked(getVideoObject).mockResolvedValue({
    Body: body(),
    ContentLength: 3,
    ContentRange: "bytes 0-2/100",
  } as never);
  const req = new Request("http://localhost", {
    headers: { Range: "bytes=0-2" },
  });
  const res = await companyVideoResponse(id, req);
  expect(getVideoObject).toHaveBeenCalledWith(id, "bytes=0-2", req.signal);
  expect(res.status).toBe(206);
  expect(res.headers.get("Content-Range")).toBe("bytes 0-2/100");
  expect((await res.arrayBuffer()).byteLength).toBe(3);
  const head = await companyVideoResponse(id, req, true);
  expect(await head.text()).toBe("");
});

test("rejects unpublished video, invalid ranges, missing object and unsatisfiable ranges", async () => {
  vi.mocked(hasPublicCompanyVideo).mockResolvedValue(false);
  await expect(
    companyVideoResponse(id, new Request("http://localhost"))
  ).rejects.toMatchObject({ status: 404 });
  expect(getVideoObject).not.toHaveBeenCalled();
  vi.mocked(hasPublicCompanyVideo).mockResolvedValue(true);
  expect(
    (
      await companyVideoResponse(
        id,
        new Request("http://localhost", { headers: { Range: "bytes=0-1,5-7" } })
      )
    ).status
  ).toBe(416);
  vi.mocked(getVideoObject).mockResolvedValue(null);
  await expect(
    companyVideoResponse(id, new Request("http://localhost"))
  ).rejects.toMatchObject({ status: 404 });
  vi.mocked(getVideoObject).mockRejectedValue(
    Object.assign(new Error("range"), { name: "InvalidRange" })
  );
  expect(
    (
      await companyVideoResponse(
        id,
        new Request("http://localhost", { headers: { Range: "bytes=999999-" } })
      )
    ).status
  ).toBe(416);
});
