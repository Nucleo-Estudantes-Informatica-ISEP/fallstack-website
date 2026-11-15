import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import { uploadAvatar, uploadCv } from "./upload";

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: vi.fn() },
  HttpClientError: class HttpClientError extends Error {},
}));

const png = new Blob(
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])],
  {
    type: "image/png",
  }
);

beforeEach(() => vi.clearAllMocks());

test("uploads file through authenticated application API", async () => {
  vi.mocked(httpClient.post).mockResolvedValue({
    id: "id",
    url: "/api/media/avatar/id",
  });
  expect(await uploadAvatar(png)).toEqual({
    id: "id",
    url: "/api/media/avatar/id",
  });
  expect(httpClient.post).toHaveBeenCalledWith(
    "/storage/avatar",
    expect.any(FormData)
  );
});

test("rejects mismatched content before upload", async () => {
  expect(
    await uploadAvatar(new Blob(["bad"], { type: "image/png" }))
  ).toBeNull();
  expect(httpClient.post).not.toHaveBeenCalled();
});

test("returns null when application rejects upload", async () => {
  vi.mocked(httpClient.post).mockRejectedValue(
    new HttpClientError("Rejected", 400)
  );
  expect(await uploadAvatar(png)).toBeNull();
});

test("CV sends bytes only to signed storage and returns only finalized id", async () => {
  const file = new File(["%PDF-1.7\n%%EOF\n"], "cv.pdf", {
    type: "application/pdf",
  });
  vi.mocked(httpClient.post)
    .mockResolvedValueOnce({
      uploadId: "ticket",
      url: "https://files.test/cvs",
      fields: { key: "quarantine/cv/ticket", Policy: "signed" },
    })
    .mockResolvedValueOnce({ id: "validated" });
  const transfer = vi
    .fn<(url: string, options: RequestInit) => Promise<Response>>()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", transfer);
  try {
    expect(await uploadCv(file)).toEqual({ id: "validated" });
    expect(httpClient.post).toHaveBeenNthCalledWith(1, "/storage/cv", {
      filename: "cv.pdf",
      contentType: "application/pdf",
      size: file.size,
    });
    expect(transfer).toHaveBeenCalledWith(
      "https://files.test/cvs",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        body: expect.any(FormData),
        redirect: "error",
      })
    );
    const form = transfer.mock.calls[0][1].body as FormData;
    expect(Array.from(form.keys()).at(-1)).toBe("file");
    expect(httpClient.post).toHaveBeenNthCalledWith(2, "/storage/cv/finalize", {
      uploadId: "ticket",
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

test("failed direct transfer cancels ticket without falling back to multipart API", async () => {
  vi.mocked(httpClient.post)
    .mockResolvedValueOnce({
      uploadId: "ticket",
      url: "https://files.test/cvs",
      fields: {},
    })
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 503 }))
  );
  try {
    expect(
      await uploadCv(
        new File(["%PDF-1.7\n%%EOF\n"], "cv.pdf", { type: "application/pdf" })
      )
    ).toBeNull();
    expect(httpClient.post).toHaveBeenLastCalledWith("/storage/cv/cancel", {
      uploadId: "ticket",
    });
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  } finally {
    vi.unstubAllGlobals();
  }
});
