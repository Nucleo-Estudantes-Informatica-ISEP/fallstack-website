import "server-only";

import { isIP } from "node:net";
import { createClient } from "@redis/client";

import type { RateLimitStore } from "@/domain/rateLimit";

// One atomic operation preserves first-request-anchored fixed windows. Denials
// neither increment the count nor extend expiry. No application clock is used.
const script = `
local count = redis.call('GET', KEYS[1])
if not count then
  redis.call('SET', KEYS[1], '1', 'PX', ARGV[1])
  return {1, 0}
end
local ttl = redis.call('PTTL', KEYS[1])
count = tonumber(count)
if not count or count < 1 or count % 1 ~= 0 or ttl < 0 then
  return redis.error_reply('INVALID_LIMITER_STATE')
end
if count >= tonumber(ARGV[2]) then return {0, math.max(1, ttl)} end
redis.call('INCR', KEYS[1])
return {1, 0}
`;

export const redisLimiterTiming = {
  deadlineMs: 300,
  connectTimeoutMs: 200,
  cooldownMs: 1000,
  maxPending: 128,
} as const;

export class LimiterStoreError extends Error {
  constructor(
    public readonly reason:
      "timeout" | "redis" | "cooldown" | "saturated" | "configuration"
  ) {
    super("Shared rate limiter unavailable");
  }
}

export function createRedisRateLimitStore(
  getConfig: () => { url: string; prefix: string },
  timing: {
    deadlineMs: number;
    connectTimeoutMs: number;
    cooldownMs: number;
    maxPending: number;
  } = redisLimiterTiming
): RateLimitStore & { close(): void } {
  let client: ReturnType<typeof createClient> | undefined;
  let connecting: Promise<unknown> | undefined;
  let retryAt = 0;
  let pending = 0;

  function discard(current: typeof client) {
    if (current !== client) return;
    client = undefined;
    connecting = undefined;
    retryAt = performance.now() + timing.cooldownMs;
    if (current?.isOpen) current.destroy();
  }

  return {
    async check(key, policy) {
      if (performance.now() < retryAt) throw new LimiterStoreError("cooldown");
      if (pending >= timing.maxPending)
        throw new LimiterStoreError("saturated");
      if (
        !Number.isSafeInteger(policy.windowMs) ||
        policy.windowMs < 1 ||
        !Number.isSafeInteger(policy.max) ||
        policy.max < 1
      )
        throw new LimiterStoreError("configuration");

      let config: ReturnType<typeof getConfig>;
      try {
        config = getConfig();
      } catch {
        throw new LimiterStoreError("configuration");
      }

      if (!client) {
        const address = new URL(config.url);
        client = createClient({
          url: config.url,
          socket: {
            connectTimeout: timing.connectTimeoutMs,
            reconnectStrategy: false,
            ...(address.protocol === "rediss:"
              ? {
                  tls: true,
                  rejectUnauthorized: true,
                  servername: isIP(address.hostname)
                    ? undefined
                    : address.hostname,
                }
              : {}),
          },
          disableOfflineQueue: true,
          commandsQueueMaxLength: timing.maxPending,
        });
        // Never forward provider errors, which can include credentials or keys.
        client.on("error", () => {});
        connecting = client.connect();
      }
      const current = client;
      pending++;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          (async () => {
            await connecting;
            if (current !== client || !current.isReady)
              throw new LimiterStoreError("redis");
            return current.eval(script, {
              keys: [`${config.prefix}ratelimit:v1:${key}`],
              arguments: [String(policy.windowMs), String(policy.max)],
            });
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new LimiterStoreError("timeout")),
              timing.deadlineMs
            );
          }),
        ]);
        if (
          !Array.isArray(result) ||
          result.length !== 2 ||
          (result[0] !== 0 && result[0] !== 1) ||
          typeof result[1] !== "number" ||
          result[1] < 0
        )
          throw new LimiterStoreError("redis");
        return result[0] === 1
          ? { status: "allowed" }
          : { status: "limited", retryAfterMs: result[1] };
      } catch (error) {
        discard(current);
        throw error instanceof LimiterStoreError
          ? error
          : new LimiterStoreError("redis");
      } finally {
        clearTimeout(timer);
        pending--;
      }
    },
    close() {
      discard(client);
    },
  };
}
