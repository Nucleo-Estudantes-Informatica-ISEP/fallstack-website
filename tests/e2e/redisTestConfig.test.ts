// @vitest-environment node
import { expect, test } from "vitest";

import { getRedisTestUrl } from "./support/redisTestConfig";

test("missing Redis explicitly fails CI while allowing an opt-in local suite", () => {
  expect(() => getRedisTestUrl({ CI: "true" })).toThrow("required");
  expect(() =>
    getRedisTestUrl({ GITHUB_ACTIONS: "true", TEST_REDIS_URL: " " })
  ).toThrow("required");
  expect(getRedisTestUrl({})).toBeUndefined();
  expect(
    getRedisTestUrl({ CI: "true", TEST_REDIS_URL: "redis://localhost:6379" })
  ).toBe("redis://localhost:6379");
});
test("rejects remote or invalid Redis targets without exposing connection details", () => {
  expect(() =>
    getRedisTestUrl({
      TEST_REDIS_URL: "redis://private:password@shared.example.org",
    })
  ).toThrow("loopback");
  expect(() => getRedisTestUrl({ TEST_REDIS_URL: "not a url" })).toThrow(
    "valid disposable"
  );
});
