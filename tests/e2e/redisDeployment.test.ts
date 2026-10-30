import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

const compose = parse(readFileSync("docker-compose.app.yml", "utf8"));
const { web, migrate, "storage-cleanup": cleanup } = compose.services;

test("Redis is external to the app stack", () => {
  expect(compose.services).not.toHaveProperty("redis");
  expect(compose.networks).not.toHaveProperty("redis_private");
  expect(compose.volumes?.redis_data).toBeUndefined();
});

test("only web joins the Redis destination network", () => {
  expect(compose.networks.redis_shared).toMatchObject({ external: true });
  expect(compose.networks.redis_shared.name).toMatch(
    /^\$\{REDIS_NETWORK_NAME:-[A-Za-z0-9][A-Za-z0-9._-]*\}$/
  );
  expect(web.networks).toContain("redis_shared");
  for (const service of [migrate, cleanup]) {
    expect(service.networks).not.toContain("redis_shared");
    expect(service.environment).not.toHaveProperty("REDIS_URL");
    expect(service.environment).not.toHaveProperty("REDIS_KEY_PREFIX");
  }
});

test("each Coolify resource requires its own runtime URL and key prefix", () => {
  expect(web.environment.REDIS_URL).toMatch(/^\$\{REDIS_URL:\?[^}]+\}$/);
  expect(web.environment.REDIS_KEY_PREFIX).toMatch(/^\$\{REDIS_KEY_PREFIX:\?/);
  for (const key of Object.keys(web.build.args)) {
    expect(key).not.toMatch(/^REDIS_/);
  }
});

test("web startup does not depend on Redis", () => {
  expect(web.depends_on).not.toHaveProperty("redis");
  expect(web.depends_on.migrate.condition).toBe(
    "service_completed_successfully"
  );
});
