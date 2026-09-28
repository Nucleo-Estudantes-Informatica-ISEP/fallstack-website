import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import { uploadAvatar } from "./upload";

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
