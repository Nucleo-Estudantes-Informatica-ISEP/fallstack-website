import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

import { createRateLimiter, getClientIp } from "./rateLimit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("allows requests under the limit and blocks once it's reached", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });

  assert.equal(limiter.check("ip-1").allowed, true);
  assert.equal(limiter.check("ip-1").allowed, true);

  const blocked = limiter.check("ip-1");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
});

test("tracks separate keys independently", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.check("ip-1").allowed, true);
  assert.equal(limiter.check("ip-2").allowed, true);
  assert.equal(limiter.check("ip-1").allowed, false);
});

test("resets once the window elapses", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.check("ip-1").allowed, true);
  assert.equal(limiter.check("ip-1").allowed, false);

  vi.advanceTimersByTime(1001);

  assert.equal(limiter.check("ip-1").allowed, true);
});

test("getClientIp reads the first hop from x-forwarded-for", () => {
  const req = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
  });
  assert.equal(getClientIp(req as never), "203.0.113.5");
});

test("getClientIp falls back to x-real-ip, then unknown", () => {
  const withRealIp = new Request("https://example.com", {
    headers: { "x-real-ip": "203.0.113.9" },
  });
  assert.equal(getClientIp(withRealIp as never), "203.0.113.9");

  const withNeither = new Request("https://example.com");
  assert.equal(getClientIp(withNeither as never), "unknown");
});
