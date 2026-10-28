import "server-only";

import { subscribe, unsubscribe } from "node:diagnostics_channel";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  collectDefaultMetrics,
  Histogram,
  Registry,
} from "@prometheus-io/client";

const methods = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

export async function startMetricsServer(options: {
  host: string;
  port: number;
  environment: "dev" | "main";
}) {
  const registry = new Registry();
  registry.setDefaultLabels({
    environment: options.environment,
    service: "web",
  });
  collectDefaultMetrics({ register: registry });
  const duration = new Histogram({
    name: "fallstack_http_request_duration_seconds",
    help: "HTTP server duration including SSR, API and static responses; aborted responses have status_code=aborted.",
    labelNames: ["method", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10, 30],
    registers: [registry],
  });
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/metrics") {
      res.writeHead(404).end();
      return;
    }
    try {
      res.writeHead(200, {
        "Content-Type": registry.contentType,
        "Cache-Control": "no-store",
      });
      res.end(await registry.metrics());
    } catch {
      res.destroy();
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const port =
    typeof address === "object" && address ? address.port : options.port;

  // Node's HTTP boundary includes pages and plain routes that bypass defineHandler.
  const observe = (message: unknown) => {
    const { request, response } = message as {
      request: IncomingMessage;
      response: ServerResponse;
    };
    if (request.socket.localPort === port) return;
    const start = performance.now();
    const method = methods.has(request.method ?? "")
      ? request.method!
      : "OTHER";
    const finish = () => {
      response.off("finish", finish);
      response.off("close", finish);
      const status = response.writableFinished
        ? String(response.statusCode)
        : "aborted";
      duration.observe(
        { method, status_code: status },
        (performance.now() - start) / 1000
      );
    };
    response.once("finish", finish);
    response.once("close", finish);
  };
  subscribe("http.server.request.start", observe);
  server.once("close", () => unsubscribe("http.server.request.start", observe));
  server.unref();
  return { server, registry };
}
