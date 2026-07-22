import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test, vi } from "vitest";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn() }));

function requestFrom(ip: string) {
  return new NextRequest("http://localhost/api/storage/avatar", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: new FormData(),
  });
}

test("returns 429 with Retry-After once an IP exceeds the upload limit", async () => {
  const ip = "198.51.100.10";

  // Consume the budget (config.uploads.avatar.rateLimit.max = 5). Each
  // allowed request reaches past the limiter and 400s on the missing file,
  // which is enough to prove the limiter let it through.
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
