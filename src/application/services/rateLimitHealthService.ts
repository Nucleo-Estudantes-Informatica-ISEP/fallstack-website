import "server-only";

import logger from "@/lib/logger";
import { observeRateLimitHealth } from "@/lib/rateLimitMetrics";

/** One bounded probe in flight; no upload traffic or user allowance needed. */
export function startRateLimitHealthMonitor(
  check: () => Promise<unknown>,
  intervalMs = 15000
) {
  let stopped = false;
  let previous: boolean | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    let healthy: boolean;
    try {
      await check();
      healthy = true;
    } catch {
      healthy = false;
    }
    if (stopped) return;
    let transition: "degraded" | "recovered" | undefined;
    if (!healthy && previous !== false) transition = "degraded";
    if (healthy && previous === false) transition = "recovered";
    observeRateLimitHealth(healthy, transition);
    if (transition === "degraded")
      logger.warn(
        { event: "rate_limit.degraded" },
        "Shared limiter synthetic check failed"
      );
    if (transition === "recovered")
      logger.info(
        { event: "rate_limit.recovered" },
        "Shared limiter synthetic check recovered"
      );
    previous = healthy;
    timer = setTimeout(() => void tick(), intervalMs);
    timer.unref?.();
  }
  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
