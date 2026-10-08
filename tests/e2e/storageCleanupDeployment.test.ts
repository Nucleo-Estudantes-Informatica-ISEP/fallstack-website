import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const compose = readFileSync("docker-compose.app.yml", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");

test("cleanup deploys with migrator dependency, runtime credentials, dry-run default and no public ports", () => {
  const worker = compose.split("  storage-cleanup:\n")[1].split("\n  web:")[0];
  expect(worker).toContain("target: storage-cleanup");
  expect(worker).toContain("condition: service_completed_successfully");
  expect(worker).toContain(
    "DIRECT_URL: ${DATABASE_URL:?Configure DATABASE_URL in Coolify}"
  );
  expect(worker).toContain(
    "STORAGE_CLEANUP_MODE: ${STORAGE_CLEANUP_MODE:-dry-run}"
  );
  expect(worker).toContain("shared_data");
  expect(worker).not.toMatch(/ports:|AUTH_|JWT_SECRET/);
  const stage = dockerfile
    .split("FROM builder AS storage-cleanup")[1]
    .split("FROM builder AS app-builder")[0];
  expect(stage).toContain("USER nextjs");
  expect(stage).toContain("HEALTHCHECK");
  expect(stage).toContain('"--daemon"');
  expect(stage).toContain('"--conditions=react-server"');
});
