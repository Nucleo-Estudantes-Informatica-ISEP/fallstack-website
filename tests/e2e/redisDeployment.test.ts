import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const compose = readFileSync("docker-compose.app.yml", "utf8");
const services = compose.split("services:\n")[1].split("\nsecrets:")[0];
const service = (name: string) =>
  services.split(`  ${name}:\n`)[1].split(/\n  [\w-]+:\n/)[0];

test("Redis is reachable only on a project-private web network", () => {
  const redis = service("redis");
  expect(redis).toContain("    networks:\n      redis_private:");
  expect(redis).toContain("aliases:\n          - redis-private");
  expect(redis).toContain("--bind 127.0.0.1 redis-private");
  expect(redis).not.toMatch(/--bind (0\.0\.0\.0|\*)/);
  expect(redis).not.toMatch(/ports:|expose:|container_name:|network_mode:/);
  expect(compose).toContain("  redis_private:\n    internal: true");
  expect(service("web")).toContain("- redis_private");
  for (const name of ["migrate", "storage-cleanup"]) {
    expect(service(name)).not.toContain("redis_private");
    expect(service(name)).not.toContain("REDIS_PASSWORD");
  }
});

test("each Coolify resource requires its own runtime credentials and key prefix", () => {
  const web = service("web");
  const redis = service("redis");
  const requiredPassword = "${REDIS_PASSWORD:?";
  expect(redis).toContain(requiredPassword);
  expect(web).toContain(requiredPassword);
  expect(web).toContain("${REDIS_KEY_PREFIX:?");
  expect(web).toContain("REDIS_HOST: redis-private");
  expect(web).toContain('REDIS_PORT: "6379"');
  expect(web.split("    environment:")[0]).not.toContain("REDIS_");
  expect(compose).not.toMatch(/name:.*redis/);
  expect(redis).toContain('--requirepass "$$REDIS_PASSWORD"');
  expect(redis).toContain("--protected-mode yes");
});

test("Redis preserves state across restarts with bounded memory and authenticated readiness", () => {
  const redis = service("redis");
  for (const config of [
    "image: redis:7.4-alpine",
    "restart: unless-stopped",
    "stop_grace_period: 30s",
    "mem_limit: 256m",
    '--appendonly yes --appendfsync everysec --save ""',
    "--maxmemory 128mb --maxmemory-policy noeviction",
    "redis_data:/data",
    'REDISCLI_AUTH="$$REDIS_PASSWORD" redis-cli ping | grep -qx PONG',
  ]) {
    expect(redis).toContain(config);
  }
  expect(compose).toContain("volumes:\n  redis_data:");
  expect(service("web")).toContain(
    "redis:\n        condition: service_healthy"
  );
});
