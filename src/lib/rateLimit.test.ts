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

test("reserve blocks once the limit is reached", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });

  const first = limiter.reserve("employee-1");
  const second = limiter.reserve("employee-1");

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(limiter.reserve("employee-1").allowed, false);
});

test("release frees a reservation", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

  const reservation = limiter.reserve("employee-1");
  assert.equal(reservation.allowed, true);
  assert.equal(limiter.reserve("employee-1").allowed, false);

  reservation.release();

  assert.equal(limiter.reserve("employee-1").allowed, true);
});

test("release is idempotent", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });

  const reservation = limiter.reserve("employee-1");
  reservation.release();
  reservation.release();

  assert.equal(limiter.reserve("employee-1").allowed, true);
  assert.equal(limiter.reserve("employee-1").allowed, true);
  assert.equal(limiter.reserve("employee-1").allowed, false);
});

test("release does not decrement a bucket from a newer window", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

  const oldReservation = limiter.reserve("employee-1");
  assert.equal(oldReservation.allowed, true);

  vi.advanceTimersByTime(1001);

  const newReservation = limiter.reserve("employee-1");
  assert.equal(newReservation.allowed, true);

  oldReservation.release();

  assert.equal(limiter.reserve("employee-1").allowed, false);
});

test("reserve tracks separate employees independently", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.reserve("employee-1").allowed, true);
  assert.equal(limiter.reserve("employee-2").allowed, true);
  assert.equal(limiter.reserve("employee-1").allowed, false);
});
