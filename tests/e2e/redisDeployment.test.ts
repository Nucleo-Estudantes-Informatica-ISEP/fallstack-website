import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

const compose = parse(readFileSync("docker-compose.app.yml", "utf8"));
const { redis, web, migrate, "storage-cleanup": cleanup } = compose.services;

test("Redis is reachable only on a project-private web network", () => {
  expect(redis.networks).toEqual({
    redis_private: { aliases: ["redis-private"] },
  });
  for (const key of ["ports", "expose", "container_name", "network_mode"]) {
    expect(redis).not.toHaveProperty(key);
  }
  expect(compose.networks.redis_private).toEqual({ internal: true });
  expect(web.networks).toContain("redis_private");
  for (const service of [migrate, cleanup]) {
    expect(service.networks).not.toContain("redis_private");
    expect(service.environment).not.toHaveProperty("REDIS_PASSWORD");
    expect(service.environment).not.toHaveProperty("REDIS_URL");
  }
});

test("each Coolify resource requires its own runtime URL, credentials and key prefix", () => {
  expect(redis.environment.REDIS_PASSWORD).toMatch(/^\$\{REDIS_PASSWORD:\?/);
  expect(web.environment.REDIS_URL).toMatch(
    /^redis:\/\/:\$\{REDIS_PASSWORD:\?[^}]+\}@redis-private:6379$/
  );
  expect(web.environment.REDIS_KEY_PREFIX).toMatch(/^\$\{REDIS_KEY_PREFIX:\?/);
  for (const key of Object.keys(web.build.args)) {
    expect(key).not.toMatch(/^REDIS_/);
  }
  expect(compose.networks.redis_private).not.toHaveProperty("name");
  expect(compose.volumes).toHaveProperty("redis_data");
  expect(compose.volumes.redis_data?.name).toBeUndefined();
});

test("Redis has persistent storage, memory headroom and health-gated web startup", () => {
  expect(redis).toMatchObject({
    image: "redis:7.4-alpine",
    restart: "unless-stopped",
    stop_grace_period: "30s",
    mem_limit: "256m",
    volumes: ["redis_data:/data"],
  });
  expect(web.depends_on.redis.condition).toBe("service_healthy");
});

test("Redis deployment smoke gates the existing required quality check", () => {
  const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
  expect(ci.jobs.quality.name).toBe("Test, typecheck, lint & build");
  expect(ci.jobs.quality.steps).toContainEqual({
    name: "Verify Redis isolation, authentication and persistence",
    run: "bash tests/e2e/redis-deployment.sh",
  });
});
