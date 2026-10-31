// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { serverEnv } from "@/config/env.server";
import { createReadinessCheck } from "@/application/services/readinessService";

import { checkRedisReadiness } from "./redisReadinessRepository";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

test("invalid Redis configuration fails readiness without breaking server configuration", async () => {
  vi.stubEnv("REDIS_URL", "not-a-redis-url");
  expect(serverEnv.AUTH_SECRET).toBe(process.env.AUTH_SECRET);
  await expect(createReadinessCheck([checkRedisReadiness])()).resolves.toBe(
    false
  );
});
