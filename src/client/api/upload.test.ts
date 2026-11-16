import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import { uploadAvatar, uploadCv } from "./upload";

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: vi.fn() },
  HttpClientError: class HttpClientError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
    }
  },
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

const makePdf = (size = 20) => {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
  return new File([bytes], "cv.pdf", { type: "application/pdf" });
};

test("CV uses owner-bound parts without application cookies and finalizes only after transfer", async () => {
  const { webcrypto } = await import("node:crypto");
  vi.stubGlobal("crypto", webcrypto);
  const file = makePdf();
  vi.mocked(httpClient.post)
    .mockResolvedValueOnce({ uploadId: "ticket", partSize: 5242880 })
    .mockResolvedValueOnce({
      url: "https://files.test/signed-part",
      headers: { "x-amz-checksum-sha256": "checksum" },
    })
    .mockResolvedValueOnce({ id: "validated" });
  const transfer = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", transfer);
  try {
    expect(await uploadCv(file)).toEqual({ id: "validated" });
    expect(httpClient.post).toHaveBeenNthCalledWith(
      1,
      "/storage/cv/multipart",
      { filename: "cv.pdf", contentType: "application/pdf", size: 20 }
    );
    expect(httpClient.post).toHaveBeenNthCalledWith(
      2,
      "/storage/cv/multipart/parts",
      {
        uploadId: "ticket",
        partNumber: 1,
        checksum: expect.stringMatching(/^[A-Za-z0-9+/]{43}=$/),
      }
    );
    expect(transfer).toHaveBeenCalledWith(
      "https://files.test/signed-part",
      expect.objectContaining({
        method: "PUT",
        credentials: "omit",
        redirect: "error",
        body: expect.any(Blob),
        headers: { "x-amz-checksum-sha256": "checksum" },
      })
    );
    expect(httpClient.post).toHaveBeenLastCalledWith("/storage/cv/finalize", {
      uploadId: "ticket",
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

test("failed second part retries only that part and never resends the accepted first part", async () => {
  const { webcrypto } = await import("node:crypto");
  vi.stubGlobal("crypto", webcrypto);
  const file = makePdf(5242881);
  vi.mocked(httpClient.post).mockImplementation(async (path) => {
    if (path === "/storage/cv/multipart")
      return { uploadId: "ticket", partSize: 5242880 };
    if (path === "/storage/cv/finalize") return { id: "validated" };
    return { url: "https://files.test/signed-part", headers: {} };
  });
  const transfer = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", transfer);
  try {
    expect(await uploadCv(file)).toEqual({ id: "validated" });
    expect(transfer.mock.calls.map(([, init]) => init.body.size)).toEqual([
      5242880, 1, 1,
    ]);
    expect(
      vi
        .mocked(httpClient.post)
        .mock.calls.filter(([path]) => path.endsWith("/parts"))
        .map(([, body]) => (body as { partNumber: number }).partNumber)
    ).toEqual([1, 2, 2]);
  } finally {
    vi.unstubAllGlobals();
  }
});

test("permanent part rejection cancels the owner ticket without using the legacy transport", async () => {
  const { webcrypto } = await import("node:crypto");
  vi.stubGlobal("crypto", webcrypto);
  vi.mocked(httpClient.post)
    .mockResolvedValueOnce({ uploadId: "ticket", partSize: 5242880 })
    .mockResolvedValueOnce({
      url: "https://files.test/signed-part",
      headers: {},
    })
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 403 }))
  );
  try {
    expect(await uploadCv(makePdf())).toBeNull();
    expect(httpClient.post).toHaveBeenLastCalledWith("/storage/cv/cancel", {
      uploadId: "ticket",
    });
    expect(httpClient.post).not.toHaveBeenCalledWith(
      "/storage/cv",
      expect.anything()
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
