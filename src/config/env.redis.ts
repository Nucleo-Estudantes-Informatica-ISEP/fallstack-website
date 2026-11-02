import "server-only";

import { z } from "zod";

const authenticatedRedisUrl = z
  .url({ protocol: /^rediss?$/ })
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return !!url.hostname && !!url.password && !url.search && !url.hash;
  }, "Redis requires a host and password; URL options and fragments are forbidden");

export const redisEnvSchema = z.object({
  REDIS_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    authenticatedRedisUrl.optional()
  ),
  REDIS_KEY_PREFIX: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum([
        "fallstack:dev:",
        "fallstack:main:",
        "fallstack:local:",
        "fallstack:test:",
      ])
      .optional()
  ),
});

export function getRedisUrl() {
  return redisEnvSchema
    .pick({ REDIS_URL: true })
    .parse({ REDIS_URL: process.env.REDIS_URL }).REDIS_URL;
}

// Readiness remains independent of unrelated app secrets. Limited request flows
// require both values through serverEnv; importing routes during a build does not.
export function requireRedisConfig(
  env: z.infer<typeof redisEnvSchema>,
  nodeEnv = process.env.NODE_ENV,
  metricsEnvironment = process.env.METRICS_ENVIRONMENT
) {
  if (!env.REDIS_URL || !env.REDIS_KEY_PREFIX)
    throw new Error(
      "REDIS_URL and REDIS_KEY_PREFIX are required for shared limits"
    );
  if (
    nodeEnv === "production" &&
    !["fallstack:dev:", "fallstack:main:"].includes(env.REDIS_KEY_PREFIX)
  )
    throw new Error(
      "REDIS_KEY_PREFIX must select dev or main in deployed web copies"
    );
  if (
    metricsEnvironment &&
    env.REDIS_KEY_PREFIX !== `fallstack:${metricsEnvironment}:`
  )
    throw new Error("REDIS_KEY_PREFIX must match METRICS_ENVIRONMENT");
  return { url: env.REDIS_URL, prefix: env.REDIS_KEY_PREFIX };
}
