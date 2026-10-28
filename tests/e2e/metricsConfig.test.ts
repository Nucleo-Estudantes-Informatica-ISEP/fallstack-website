import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const read = (file: string) =>
  readFileSync(path.resolve(__dirname, "../..", file), "utf8");

test("metrics require explicit deployment identity and stay off the public application port", () => {
  const compose = read("docker-compose.app.yml");
  for (const name of [
    "METRICS_ENABLED",
    "METRICS_ENVIRONMENT",
    "METRICS_HOST",
  ]) {
    expect(compose).toContain(`${name}:`);
    expect(read(".env.example")).toContain(name);
    expect(read("src/config/env.metrics.ts")).toContain(name);
  }
  expect(compose).toContain("metrics_enabled: ${METRICS_ENABLED:-false}");
  expect(compose).toContain("metrics_service: redis");
  expect(compose).not.toMatch(/ports:.*9464/);
  expect(read("Dockerfile")).toContain("EXPOSE 4000 9464");
  const prometheus = read("monitoring/prometheus.yml");
  expect(prometheus).toContain("__meta_docker_port_private");
  expect(prometheus).toContain('regex: "9464"');
  expect(prometheus).toContain("metrics_enabled=true");
  expect(prometheus).toContain("regex: dev|main");
  expect(prometheus).toContain("target_label: copy");
  // Node resource/handle metrics need type to avoid merging distinct series.
  expect(prometheus).toContain("|space|type|version|");
});

test("host collector retains operational allowlists, not Docker labels, env or request payloads", () => {
  const config = read("monitoring/telegraf.conf");
  expect(config).toContain(
    'docker_label_include = ["metrics_environment", "metrics_service"]'
  );
  expect(config).toContain("tag_env = []");
  expect(config).toContain("has(tags.metrics_environment) &&");
  expect(config).toContain("has(tags.metrics_service) &&");
  expect(config).not.toContain("[inputs.docker.tagpass]");
  expect(config).toContain("string_as_label = false");
  expect(config).toContain('dest = "healthy"');
  expect(config).not.toContain("[[inputs.redis]]");
  expect(config).toContain('listen = "127.0.0.1:9273"');
  for (const field of [
    "restart_count",
    "numbackends",
    "health_status",
    "response_status_code_match",
  ]) {
    expect(config).toContain(`"${field}"`);
  }
  for (const service of ["authnei", "proxy", "redis", "minio"]) {
    expect(config).toContain(`"${service}"`);
  }
  expect(config.replace(/^#.*$/gm, "")).not.toMatch(
    /inputs\.(exec|tail)|response_body_field|http_header_tags|pg_stat_activity/
  );
  const compose = read("monitoring/compose.yml");
  expect(compose).toContain("--web.listen-address=127.0.0.1:9090");
  expect(compose).toContain("--storage.tsdb.retention.time=7d");
  expect(compose).toContain("--storage.tsdb.retention.size=1GB");
});
