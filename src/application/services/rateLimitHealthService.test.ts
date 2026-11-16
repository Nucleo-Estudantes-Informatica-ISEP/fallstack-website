// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import logger from "@/lib/logger";
import { observeRateLimitHealth } from "@/lib/rateLimitMetrics";

import { startRateLimitHealthMonitor } from "./rateLimitHealthService";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ default: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/rateLimitMetrics", () => ({ observeRateLimitHealth: vi.fn() }));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

test("observes idle outage and recovery, logs transitions once and stops scheduling on close", async () => {
  vi.useFakeTimers();
  const check = vi
    .fn()
    .mockRejectedValueOnce(new Error("private-provider-details"))
    .mockRejectedValueOnce(new Error())
    .mockResolvedValue(undefined);
  const stop = startRateLimitHealthMonitor(check);
  await vi.advanceTimersByTimeAsync(0);
  expect(observeRateLimitHealth).toHaveBeenLastCalledWith(false, "degraded");
  await vi.advanceTimersByTimeAsync(15000);
  expect(observeRateLimitHealth).toHaveBeenLastCalledWith(false, undefined);
  await vi.advanceTimersByTimeAsync(15000);
  expect(observeRateLimitHealth).toHaveBeenLastCalledWith(true, "recovered");
  expect(logger.warn).toHaveBeenCalledTimes(1);
  expect(logger.info).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(
    "private-provider-details"
  );
  stop();
  await vi.advanceTimersByTimeAsync(30000);
  expect(check).toHaveBeenCalledTimes(3);
});

test("never overlaps probes or publishes observations after shutdown", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const check = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const stop = startRateLimitHealthMonitor(check);
  await vi.advanceTimersByTimeAsync(60000);
  expect(check).toHaveBeenCalledTimes(1);
  stop();
  finish();
  await vi.advanceTimersByTimeAsync(0);
  expect(observeRateLimitHealth).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
