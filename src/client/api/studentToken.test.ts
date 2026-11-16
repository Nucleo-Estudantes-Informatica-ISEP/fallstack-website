import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import { getStudentPreviewToken } from "./studentToken";

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { post: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

test("returns the preview token for a known student code", async () => {
  vi.mocked(httpClient.post).mockResolvedValue({ token: "preview-token" });

  await expect(getStudentPreviewToken("AB12CD")).resolves.toBe("preview-token");
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

  await expect(getStudentPreviewToken("AB12C")).resolves.toBeNull();
});

test.each([401, 403, 429, 500])(
  "still surfaces %i as an error instead of an invalid code",
  async (status) => {
    vi.mocked(httpClient.post).mockRejectedValue(
      new HttpClientError("Request failed", status)
    );

    await expect(getStudentPreviewToken("AB12CD")).rejects.toThrow(
      "Request failed"
    );
  }
);
