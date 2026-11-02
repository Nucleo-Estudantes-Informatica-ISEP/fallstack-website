import { expect, test, vi } from "vitest";

import logger from "@/lib/logger";
import { observeRateLimit } from "@/lib/rateLimitMetrics";
import { LimiterStoreError } from "@/application/repositories/redisRateLimitRepository";

import { createRateLimitService } from "./rateLimitService";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ default: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/rateLimitMetrics", () => ({
  observeRateLimit: vi.fn(),
  observeRateLimitTransition: vi.fn(),
}));
test("isolates endpoints and hashes subjects without publishing them to observability", async () => {
  const check = vi.fn().mockResolvedValue({ status: "allowed" });
  const limit = createRateLimitService({ check });
  const policy = { max: 5, windowMs: 60000 };
  await limit("upload_cv", "private-subject", policy);
  await limit("upload_avatar", "private-subject", policy);
  expect(check.mock.calls[0][0]).toMatch(/^upload_cv:[a-f0-9]{64}$/);
  expect(check.mock.calls[1][0]).toBe(
    check.mock.calls[0][0].replace("upload_cv", "upload_avatar")
  );
  expect(JSON.stringify(vi.mocked(observeRateLimit).mock.calls)).not.toContain(
    "private-subject"
  );
});
test("fails closed on ambiguous errors, logs transitions once and recovers without fallback", async () => {
  vi.clearAllMocks();
  const check = vi
    .fn()
    .mockRejectedValueOnce(new LimiterStoreError("timeout"))
    .mockRejectedValueOnce(new Error("redis://secret-cookie-token@host"))
    .mockResolvedValueOnce({ status: "limited", retryAfterMs: 1234 });
  const limit = createRateLimitService({ check });
  const policy = { max: 5, windowMs: 60000 };
  expect(await limit("upload_cv", "private-id", policy)).toEqual({
    status: "unavailable",
  });
  expect(await limit("upload_cv", "private-id", policy)).toEqual({
    status: "unavailable",
  });
  expect(await limit("upload_cv", "private-id", policy)).toEqual({
    status: "limited",
    retryAfterMs: 1234,
  });
  expect(logger.warn).toHaveBeenCalledTimes(1);
  expect(logger.info).toHaveBeenCalledTimes(1);
  expect(observeRateLimit).toHaveBeenCalledWith(
    "upload_cv",
    "unavailable",
    expect.any(Number),
    "timeout"
  );
  expect(
    JSON.stringify([
      vi.mocked(logger.warn).mock.calls,
      vi.mocked(logger.info).mock.calls,
      vi.mocked(observeRateLimit).mock.calls,
    ])
  ).not.toMatch(/private-id|secret-cookie-token/);
});
