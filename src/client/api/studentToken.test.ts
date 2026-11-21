import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import { getStudentPreview } from "./studentToken";

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { post: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

test("returns the preview token for a known student code", async () => {
  vi.mocked(httpClient.post).mockResolvedValue({
    code: "AB12CD",
    token: "preview-token",
  });

  await expect(getStudentPreview("AB12CD")).resolves.toEqual({
    code: "AB12CD",
    token: "preview-token",
  });
  expect(httpClient.post).toHaveBeenCalledWith("/students/token", {
    code: "AB12CD",
  });
});

test.each([
  [404, "an unknown code"],
  [400, "a code the server rejects as malformed (e.g. five characters)"],
])("treats %i (%s) as an invalid code", async (status) => {
  vi.mocked(httpClient.post).mockRejectedValue(
    new HttpClientError("Invalid student code", status)
  );

  await expect(getStudentPreview("AB12C")).resolves.toBeNull();
});

test.each([401, 403, 429, 500])(
  "still surfaces %i as an error instead of an invalid code",
  async (status) => {
    vi.mocked(httpClient.post).mockRejectedValue(
      new HttpClientError("Request failed", status)
    );

    await expect(getStudentPreview("AB12CD")).rejects.toThrow("Request failed");
  }
);

test("exchanges a scanned signed pass through the authenticated endpoint", async () => {
  vi.mocked(httpClient.post).mockResolvedValue({
    code: "AB12",
    token: "preview",
  });
  expect(await getStudentPreview({ token: "signed-pass" })).toEqual({
    code: "AB12",
    token: "preview",
  });
  expect(httpClient.post).toHaveBeenCalledWith("/students/token", {
    token: "signed-pass",
  });
});
