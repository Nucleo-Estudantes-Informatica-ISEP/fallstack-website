import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";

import {
  credentialFromScan,
  getCheckInCount,
  recordCheckIn,
} from "./attendance";

vi.mock("client-only", () => ({}));
vi.mock("@/config/api", () => ({ BASE_URL: "/api" }));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

const error = (
  message: string,
  status: number,
  body?: unknown,
  headers?: Headers
) => new HttpClientError(message, status, body, headers);

test.each([
  [
    "a recorded check-in",
    {
      ok: {
        checkedInAt: "2026-11-17T10:34:00.000Z",
        student: { name: "Maria Silva" },
      },
    },
    {
      kind: "recorded",
      name: "Maria Silva",
      checkedInAt: "2026-11-17T10:34:00.000Z",
    },
  ],
  [
    "a duplicate",
    {
      fail: error(
        "This student has already checked in for this session.",
        409,
        {
          error: "x",
          student: { name: "Joao Costa" },
        }
      ),
    },
    { kind: "duplicate", name: "Joao Costa" },
  ],
  [
    "a scan outside the session",
    { fail: error("Check-in is not available outside this session.", 400) },
    { kind: "outside-session" },
  ],
  [
    "an expired token",
    { fail: error("Invalid or expired pass token.", 400) },
    { kind: "invalid-credential" },
  ],
  [
    "an unknown credential",
    { fail: error("Invalid student credential.", 400) },
    { kind: "invalid-credential" },
  ],
  [
    "an unknown session",
    { fail: error("Session not found.", 404) },
    { kind: "session-not-found" },
  ],
  [
    "a rate limit",
    {
      fail: error(
        "Too many",
        429,
        undefined,
        new Headers({ "Retry-After": "3" })
      ),
    },
    { kind: "rate-limited", retryAfterSeconds: 3 },
  ],
  [
    "a rate limit without Retry-After",
    { fail: error("Too many", 429) },
    { kind: "rate-limited", retryAfterSeconds: 5 },
  ],
  ["a server outage", { fail: error("x", 503) }, { kind: "unavailable" }],
  [
    "a network failure",
    { fail: new TypeError("Failed to fetch") },
    { kind: "unavailable" },
  ],
  [
    "expired staff rights",
    { fail: error("Forbidden", 403) },
    { kind: "unauthorized" },
  ],
  [
    "a signed-out staff member",
    { fail: error("Unauthorized", 401) },
    { kind: "unauthorized" },
  ],
])("recordCheckIn maps %s", async (_label, result, outcome) => {
  if ("ok" in result) vi.mocked(httpClient.post).mockResolvedValue(result.ok);
  else vi.mocked(httpClient.post).mockRejectedValue(result.fail);

  await expect(recordCheckIn("s1", { token: "t" })).resolves.toEqual(outcome);
  expect(httpClient.post).toHaveBeenCalledWith("/sessions/s1/check-ins", {
    token: "t",
  });
});

test("getCheckInCount maps success, expired rights and errors", async () => {
  vi.mocked(httpClient.get).mockResolvedValueOnce({ count: 4 });
  await expect(getCheckInCount("s1")).resolves.toEqual({
    kind: "count",
    count: 4,
  });
  expect(httpClient.get).toHaveBeenCalledWith("/sessions/s1/check-ins/count");

  vi.mocked(httpClient.get).mockRejectedValueOnce(error("Forbidden", 403));
  await expect(getCheckInCount("s1")).resolves.toEqual({
    kind: "unauthorized",
  });

  vi.mocked(httpClient.get).mockRejectedValueOnce(error("boom", 500));
  await expect(getCheckInCount("s1")).resolves.toEqual({ kind: "error" });
});

test("session ids are URL-encoded in paths", async () => {
  vi.mocked(httpClient.get).mockResolvedValueOnce({ count: 0 });
  await getCheckInCount("a/b");
  expect(httpClient.get).toHaveBeenCalledWith(
    "/sessions/a%2Fb/check-ins/count"
  );
});

test("credentialFromScan sends student codes as codes and the rest as tokens", () => {
  expect(credentialFromScan(" ab12 ")).toEqual({ code: "AB12" });
  expect(credentialFromScan("eyJhbGciOi.x.y")).toEqual({
    token: "eyJhbGciOi.x.y",
  });
});
