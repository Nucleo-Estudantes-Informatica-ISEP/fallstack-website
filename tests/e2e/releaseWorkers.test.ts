import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

const { services } = parse(readFileSync("docker-compose.app.yml", "utf8"));

test("only web replica count is configurable; release jobs stay singleton", () => {
  expect(services.web.deploy.replicas).toBe("${WEB_REPLICAS:-1}");
  for (const name of ["migrate", "storage-cleanup"]) {
    expect(services[name].deploy.replicas).toBe(1);
  }
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
