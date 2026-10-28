// @vitest-environment node
import { once } from "node:events";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import type { Histogram } from "@prometheus-io/client";
import { afterAll, expect, test, vi } from "vitest";

import { startMetricsServer } from "./metrics";

vi.mock("server-only", () => ({}));

const metrics = await startMetricsServer({
  host: "127.0.0.1",
  port: 0,
  environment: "dev",
});
const app = createServer((req, res) => {
  if (req.url?.startsWith("/abort")) res.destroy();
  else res.writeHead(req.url?.startsWith("/fail") ? 503 : 200).end("ok");
}).listen(0, "127.0.0.1");
await once(app, "listening");
const appUrl = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
const metricsUrl = `http://127.0.0.1:${(metrics.server.address() as AddressInfo).port}`;

afterAll(async () => {
  await Promise.all(
    [app, metrics.server].map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        })
    )
  );
});

test("observes real HTTP successes, failures and aborts without collecting request data", async () => {
  const secret = "private-token-and-student-code";
  expect(
    (
      await fetch(`${appUrl}/student/${secret}?token=${secret}`, {
        headers: {
          authorization: `Bearer ${secret}`,
          cookie: `session=${secret}`,
        },
      })
    ).status
  ).toBe(200);
  expect((await fetch(`${appUrl}/fail?token=${secret}`)).status).toBe(503);
  await new Promise<void>((resolve) => {
    const req = request(`${appUrl}/abort`, () => {});
    req.on("error", () => resolve());
    req.end();
  });
  const response = await fetch(`${metricsUrl}/metrics`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/plain");
  const text = await response.text();
  expect(text).toContain('status_code="200"');
  expect(text).toContain('status_code="503"');
  expect(text).toContain('status_code="aborted"');
  expect(text).toContain('environment="dev"');
  expect(text).toContain("process_resident_memory_bytes");
  expect(text).not.toContain(secret);
  expect(text).not.toMatch(
    /authorization|cookie|student\/|token=|traceId|spanId/
  );
  const counts = (
    await (
      metrics.registry.getSingleMetric(
        "fallstack_http_request_duration_seconds"
      ) as Histogram<string>
    ).get()
  ).values.filter((value) => value.metricName?.endsWith("_count"));
  expect(
    counts.map((value) => [value.labels.status_code, value.value])
  ).toEqual([
    ["200", 1],
    ["503", 1],
    ["aborted", 1],
  ]);
});

test("private listener exposes only GET /metrics and excludes its own requests", async () => {
  const before = await metrics.registry
    .getSingleMetric("fallstack_http_request_duration_seconds")!
    .get();
  expect(
    (await fetch(`${metricsUrl}/metrics`, { method: "POST" })).status
  ).toBe(404);
  expect((await fetch(`${metricsUrl}/other`)).status).toBe(404);
  await fetch(`${metricsUrl}/metrics`);
  const after = await metrics.registry
    .getSingleMetric("fallstack_http_request_duration_seconds")!
    .get();
  expect(after.values).toEqual(before.values);
});
