import { expect, test, vi } from "vitest";

import { redisEnvSchema, requireRedisConfig } from "./env.redis";

vi.mock("server-only", () => ({}));
const url = "redis://default:test-only@127.0.0.1:6379";
test.each([
  "redis://localhost:6379",
  "redis://user@localhost",
  "http://user:pass@host",
  "rediss://user:pass@host?rejectUnauthorized=false",
  "redis://:pass@host#fragment",
])(
  "rejects unauthenticated or ambiguous Redis configuration %s",
  (REDIS_URL) => {
    expect(redisEnvSchema.safeParse({ REDIS_URL }).success).toBe(false);
  }
);
test.each(["redis", "rediss"])(
  "accepts authenticated %s connections",
  (protocol) => {
    expect(
      redisEnvSchema.parse({ REDIS_URL: url.replace("redis:", `${protocol}:`) })
        .REDIS_URL
    ).toBeTruthy();
  }
);
test("shared flows require a URL and an explicit isolated prefix", () => {
  expect(() => requireRedisConfig({ REDIS_URL: url }, "test", "")).toThrow(
    "required"
  );
  expect(() =>
    requireRedisConfig({ REDIS_KEY_PREFIX: "fallstack:test:" }, "test", "")
  ).toThrow("required");
  expect(
    redisEnvSchema.safeParse({ REDIS_KEY_PREFIX: "fallstack:" }).success
  ).toBe(false);
  expect(() =>
    requireRedisConfig(
      { REDIS_URL: url, REDIS_KEY_PREFIX: "fallstack:test:" },
      "production",
      ""
    )
  ).toThrow("dev or main");
  expect(() =>
    requireRedisConfig(
      { REDIS_URL: url, REDIS_KEY_PREFIX: "fallstack:main:" },
      "production",
      "dev"
    )
  ).toThrow("match");
  expect(
    requireRedisConfig(
      { REDIS_URL: url, REDIS_KEY_PREFIX: "fallstack:dev:" },
      "production",
      "dev"
    ).prefix
  ).toBe("fallstack:dev:");
});
