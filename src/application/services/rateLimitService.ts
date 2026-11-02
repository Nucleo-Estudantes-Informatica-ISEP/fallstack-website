import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { requireRedisConfig } from "@/config/env.redis";
import { serverEnv } from "@/config/env.server";
import { observeRateLimit } from "@/lib/rateLimitMetrics";
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
    } catch (error) {
      reason = error instanceof LimiterStoreError ? error.reason : "redis";
      decision = { status: "unavailable" };
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
  fallstackRateLimitStore?: ReturnType<typeof createRedisRateLimitStore>;
};
const store = (state.fallstackRateLimitStore ??= createRedisRateLimitStore(() =>
  requireRedisConfig(serverEnv)
));
export const checkRateLimit = (state.fallstackRateLimitCheck ??=
  createRateLimitService(store));

// Unique per runtime, never a real subject's budget. Repeated probes exercise
// the exact script/client/config used by uploads; the synthetic key expires.
const healthKey = `health:${randomUUID()}`;
export async function checkRateLimitHealth() {
  await store.check(healthKey, { max: 1, windowMs: 1000 });
}
