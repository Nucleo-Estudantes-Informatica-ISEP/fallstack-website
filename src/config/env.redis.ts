import "server-only";

import { z } from "zod";

const redisUrlSchema = z.object({
  REDIS_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url({ protocol: /^rediss?$/ }).optional()
  ),
});

export function getRedisUrl() {
  return redisUrlSchema.parse({ REDIS_URL: process.env.REDIS_URL }).REDIS_URL;
}
