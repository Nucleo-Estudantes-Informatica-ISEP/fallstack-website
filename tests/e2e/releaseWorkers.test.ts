import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

const { services } = parse(readFileSync("docker-compose.app.yml", "utf8"));

test("capacity resource budgets require an explicit staging override", () => {
  expect(services.web.deploy.resources).toBeUndefined();
  const override = parse(readFileSync("docker-compose.capacity.yml", "utf8"));
  expect(override.services.web.deploy.resources.limits).toEqual({
    cpus: "${CAPACITY_WEB_CPU_LIMIT:-1.0}",
    memory: "${CAPACITY_WEB_MEMORY_LIMIT:-768M}",
  });
  expect(Object.keys(override.services)).toEqual(["web"]);
});

test("Coolify configuration pins web and release jobs to one without env overrides", () => {
  for (const name of ["web", "migrate", "storage-cleanup"]) {
    expect(services[name].deploy.replicas).toBe(1);
  }
  expect(readFileSync("docker-compose.app.yml", "utf8")).not.toContain(
    "${WEB_REPLICAS"
  );
  expect(readFileSync(".env.example", "utf8")).not.toMatch(/^WEB_REPLICAS=/m);
});

test("every web copy and cleanup wait for the same successful migration", () => {
  for (const name of ["web", "storage-cleanup"]) {
    expect(services[name].depends_on.migrate).toEqual({
      condition: "service_completed_successfully",
    });
  }
  expect(services.migrate.restart).toBe("no");
  expect(services.web.command).toBeUndefined();
  expect(services.web.entrypoint).toBeUndefined();
  expect(services.web.ports).toBeUndefined();
  expect(services.web.container_name).toBeUndefined();
});
