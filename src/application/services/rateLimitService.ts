import "server-only";

import { createHash } from "node:crypto";

import { requireRedisConfig } from "@/config/env.redis";
import { serverEnv } from "@/config/env.server";
import logger from "@/lib/logger";
import {
  observeRateLimit,
  observeRateLimitTransition,
} from "@/lib/rateLimitMetrics";
import {
  createRedisRateLimitStore,
  LimiterStoreError,
} from "@/application/repositories/redisRateLimitRepository";
import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimitStore,
} from "@/domain/rateLimit";

export type LimitedEndpoint = "upload_cv" | "upload_avatar";

export function createRateLimitService(store: RateLimitStore) {
  let degraded = false;
  return async (
    endpoint: LimitedEndpoint,
    userId: string,
    policy: RateLimitPolicy
  ): Promise<RateLimitDecision> => {
    const start = performance.now();
    let decision: RateLimitDecision;
    let reason = "none";
    try {
      const subject = createHash("sha256").update(userId).digest("hex");
      decision = await store.check(`${endpoint}:${subject}`, policy);
      if (degraded) {
        observeRateLimitTransition("recovered");
        logger.info(
          { event: "rate_limit.recovered" },
          "Shared limiter recovered"
        );
        degraded = false;
      }
    } catch (error) {
      reason = error instanceof LimiterStoreError ? error.reason : "redis";
      decision = { status: "unavailable" };
      if (!degraded) {
        observeRateLimitTransition("degraded");
        logger.warn(
          { event: "rate_limit.degraded", reason },
          "Shared limiter unavailable; requests denied"
        );
        degraded = true;
      }
    }
    observeRateLimit(
      endpoint,
      decision.status,
      (performance.now() - start) / 1000,
      reason
    );
    return decision;
  };
}

const state = globalThis as typeof globalThis & {
  fallstackRateLimitCheck?: ReturnType<typeof createRateLimitService>;
};
export const checkRateLimit = (state.fallstackRateLimitCheck ??=
  createRateLimitService(
    createRedisRateLimitStore(() => requireRedisConfig(serverEnv))
  ));
