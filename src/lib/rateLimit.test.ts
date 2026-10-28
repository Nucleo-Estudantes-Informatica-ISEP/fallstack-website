import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

import { createRateLimiter } from "./rateLimit";

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

test("reservations block atomically and release only their own count once", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
  const first = limiter.reserve("employee-1");
  const second = limiter.reserve("employee-1");
  const blocked = limiter.reserve("employee-1");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(blocked.allowed, false);
  blocked.release();
  assert.equal(limiter.check("employee-1").allowed, false);
  first.release();
  first.release();
  assert.equal(limiter.check("employee-1").allowed, true);
  assert.equal(limiter.check("employee-1").allowed, false);
});

test("old reservations cannot refund a new window", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
  const old = limiter.reserve("employee-1");
  vi.advanceTimersByTime(1001);
  assert.equal(limiter.check("employee-1").allowed, true);
  old.release();
  assert.equal(limiter.check("employee-1").allowed, false);
});

test("blocked reservations report the remaining window", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
  limiter.reserve("employee-1");
  vi.advanceTimersByTime(400);
  assert.equal(limiter.reserve("employee-1").retryAfterMs, 600);
});
