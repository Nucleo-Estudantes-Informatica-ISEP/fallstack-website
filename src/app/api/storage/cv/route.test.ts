import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn() }));

function requestFrom(ip: string) {
  return new NextRequest("http://localhost/api/storage/cv", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: new FormData(),
  });
}

test("rejects an unauthenticated upload with 401", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);

  const res = await POST(requestFrom("198.51.100.2"));

  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "Unauthorized" });
});

test("returns 429 with Retry-After once an IP exceeds the upload limit", async () => {
  vi.mocked(getServerSession).mockResolvedValue(
    {} as Awaited<ReturnType<typeof getServerSession>>
  );

  const ip = "198.51.100.20";

  // Consume the budget (config.uploads.cv.rateLimit.max = 5). Each allowed
  // request reaches past the limiter and auth check, then 400s on the
  // missing file - enough to prove the limiter let it through.
  for (let i = 0; i < 5; i++) {
    const res = await POST(requestFrom(ip));
    assert.equal(res.status, 400);
  }

  const blocked = await POST(requestFrom(ip));
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);

  const body = await blocked.json();
  assert.equal(body.error, "Too many requests");
});
