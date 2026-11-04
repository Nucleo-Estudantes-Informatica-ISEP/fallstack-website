// @vitest-environment node
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  decrementActiveRequests,
  getActiveRequestCount,
  handleRequestStart,
  incrementActiveRequests,
  initGracefulShutdown,
  isHealthOrReadinessProbe,
  isShuttingDown,
  resetShutdownState,
  setShuttingDown,
  startGracefulShutdown,
  waitForActiveRequests,
} from "./shutdownService";

vi.mock("server-only", () => ({}));
vi.mock("@/application/repositories/readinessRepository", () => ({
  disconnectDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type MockResponse = ServerResponse & {
  headers: Record<string, string>;
  appliedArgs?: unknown[];
};

function createMockHttpPair(options?: {
  url?: string;
  port?: number;
  headersSent?: boolean;
}) {
  const req = Object.assign(new EventEmitter(), {
    url: options?.url ?? "/api/test",
    method: "GET",
    socket: { localPort: options?.port ?? 4000 },
  }) as unknown as IncomingMessage;

  const headers: Record<string, string> = {};
  const res = Object.assign(new EventEmitter(), {
    headersSent: options?.headersSent ?? false,
    statusCode: 200,
    setHeader: vi.fn((key: string, val: string) => {
      headers[key.toLowerCase()] = val;
    }),
    writeHead: vi.fn(function (
      this: ServerResponse,
      code: number,
      ...rest: unknown[]
    ) {
      this.statusCode = code;
      (this as MockResponse).appliedArgs = [code, ...rest];
      return this;
    }),
    end: vi.fn(),
  }) as unknown as MockResponse;
  res.headers = headers;

  return { req, res };
}

describe("shutdownService", () => {
  beforeEach(() => {
    resetShutdownState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetShutdownState();
  });

  test("lifecycle state management: shutting down and active requests", () => {
    expect(isShuttingDown()).toBe(false);
    expect(getActiveRequestCount()).toBe(0);

    setShuttingDown(true);
    expect(isShuttingDown()).toBe(true);

    expect(incrementActiveRequests()).toBe(1);
    expect(incrementActiveRequests()).toBe(2);
    expect(getActiveRequestCount()).toBe(2);

    expect(decrementActiveRequests()).toBe(1);
    expect(decrementActiveRequests()).toBe(0);
    expect(decrementActiveRequests()).toBe(0); // Bounded at 0

    resetShutdownState();
    expect(isShuttingDown()).toBe(false);
    expect(getActiveRequestCount()).toBe(0);
  });

  test("identifies health, readiness and metrics probe paths including absolute URIs", () => {
    expect(isHealthOrReadinessProbe("/api/health")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/health/")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/health?probe=1")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/ready")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/ready/")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/proxy-ready")).toBe(true);
    expect(isHealthOrReadinessProbe("/api/proxy-ready/")).toBe(true);
    expect(isHealthOrReadinessProbe("/metrics")).toBe(true);
    expect(isHealthOrReadinessProbe("/metrics/")).toBe(true);

    // Absolute URIs
    expect(
      isHealthOrReadinessProbe("http://localhost:4000/api/proxy-ready")
    ).toBe(true);
    expect(
      isHealthOrReadinessProbe("http://127.0.0.1:4000/api/health?x=1")
    ).toBe(true);
    expect(isHealthOrReadinessProbe("http://cluster.local/api/ready")).toBe(
      true
    );
    expect(isHealthOrReadinessProbe("http://cluster.local/metrics")).toBe(true);

    expect(isHealthOrReadinessProbe("/api/users")).toBe(false);
    expect(isHealthOrReadinessProbe("http://localhost:4000/api/users")).toBe(
      false
    );
    expect(isHealthOrReadinessProbe("/")).toBe(false);
    expect(isHealthOrReadinessProbe("")).toBe(false);
    expect(isHealthOrReadinessProbe(undefined)).toBe(false);
  });

  test("request tracking: normal operation increments and decrements on response completion", () => {
    const { req: req1, res: res1 } = createMockHttpPair({
      url: "/api/students",
    });
    const { req: req2, res: res2 } = createMockHttpPair({
      url: "/api/companies",
    });

    handleRequestStart({ request: req1, response: res1 });
    expect(getActiveRequestCount()).toBe(1);

    handleRequestStart({ request: req2, response: res2 });
    expect(getActiveRequestCount()).toBe(2);

    res1.emit("finish");
    expect(getActiveRequestCount()).toBe(1);

    res2.emit("close");
    expect(getActiveRequestCount()).toBe(0);
  });

  test("probe requests do not increment active user requests", () => {
    const { req: healthReq, res: healthRes } = createMockHttpPair({
      url: "/api/health",
    });
    const { req: readyReq, res: readyRes } = createMockHttpPair({
      url: "/api/ready",
    });
    const { req: proxyReq, res: proxyRes } = createMockHttpPair({
      url: "/api/proxy-ready",
    });

    handleRequestStart({ request: healthReq, response: healthRes });
    handleRequestStart({ request: readyReq, response: readyRes });
    handleRequestStart({ request: proxyReq, response: proxyRes });
    expect(getActiveRequestCount()).toBe(0);
  });

  test("ignores private metrics listener requests on port 9464", () => {
    const { req, res } = createMockHttpPair({ url: "/metrics", port: 9464 });

    handleRequestStart({ request: req, response: res });
    expect(getActiveRequestCount()).toBe(0);
  });

  test("requests arriving during shutdown are tracked and marked Connection: close without premature termination", () => {
    setShuttingDown(true);

    const { req: appReq, res: appRes } = createMockHttpPair({
      url: "/api/upload",
    });
    handleRequestStart({ request: appReq, response: appRes });

    // Request is tracked as active for clean draining, not terminated in diagnostics_channel
    expect(getActiveRequestCount()).toBe(1);
    expect(appRes.end).not.toHaveBeenCalled();

    // When the route handler responds, Connection: close is injected into writeHead arguments
    appRes.writeHead(200, { "Content-Type": "application/json" });
    expect(appRes.appliedArgs).toEqual([
      200,
      { "Content-Type": "application/json", Connection: "close" },
    ]);

    appRes.emit("finish");
    expect(getActiveRequestCount()).toBe(0);
  });

  test("sanitizes writeHead arguments to enforce Connection: close even if keep-alive was requested", () => {
    setShuttingDown(true);

    // Object headers with explicit keep-alive
    const { req: req1, res: res1 } = createMockHttpPair({ url: "/api/test1" });
    handleRequestStart({ request: req1, response: res1 });
    res1.writeHead(200, {
      connection: "keep-alive",
      "content-type": "application/json",
    });
    expect(res1.appliedArgs).toEqual([
      200,
      { "content-type": "application/json", Connection: "close" },
    ]);

    // Array headers
    const { req: req2, res: res2 } = createMockHttpPair({ url: "/api/test2" });
    handleRequestStart({ request: req2, response: res2 });
    res2.writeHead(200, ["Connection", "keep-alive", "X-Custom", "val"]);
    expect(res2.appliedArgs).toEqual([
      200,
      ["X-Custom", "val", "Connection", "close"],
    ]);

    // Status message overload: writeHead(statusCode, statusMessage, headers)
    const { req: req3, res: res3 } = createMockHttpPair({ url: "/api/test3" });
    handleRequestStart({ request: req3, response: res3 });
    res3.writeHead(200, "OK", { connection: "keep-alive" });
    expect(res3.appliedArgs).toEqual([200, "OK", { Connection: "close" }]);
  });

  test("in-flight requests receive Connection: close when shutdown starts while active", () => {
    const { req, res } = createMockHttpPair({ url: "/api/long-job" });
    handleRequestStart({ request: req, response: res });
    expect(getActiveRequestCount()).toBe(1);

    // Shutdown signal arrives while request is being processed
    setShuttingDown(true);

    // In-flight request finishes and calls writeHead
    res.writeHead(200);
    expect(res.setHeader).toHaveBeenCalledWith("Connection", "close");

    res.emit("finish");
    expect(getActiveRequestCount()).toBe(0);
  });

  test("waitForActiveRequests resolves immediately when count is zero", async () => {
    await expect(waitForActiveRequests()).resolves.toBe(true);
  });

  test("waitForActiveRequests waits for active requests to drain", async () => {
    incrementActiveRequests();
    incrementActiveRequests();

    let drained = false;
    const promise = waitForActiveRequests(5000).then((res) => {
      drained = res;
      return res;
    });

    expect(drained).toBe(false);
    decrementActiveRequests();
    expect(drained).toBe(false);
    decrementActiveRequests();

    await expect(promise).resolves.toBe(true);
    expect(drained).toBe(true);
  });

  test("waitForActiveRequests times out if active requests never finish", async () => {
    incrementActiveRequests();
    const result = await waitForActiveRequests(50);
    expect(result).toBe(false);
  });

  test("startGracefulShutdown drains active requests, executes cleanup and exits 0", async () => {
    const exit = vi.fn();
    const onCleanup = vi.fn().mockResolvedValue(undefined);

    incrementActiveRequests();

    const shutdownPromise = startGracefulShutdown({
      drainTimeoutMs: 1000,
      onCleanup,
      exit,
    });

    expect(isShuttingDown()).toBe(true);
    expect(exit).not.toHaveBeenCalled();

    // Finish active request
    decrementActiveRequests();

    await shutdownPromise;
    expect(onCleanup).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  test("startGracefulShutdown respects deregistrationDelayMs before completing shutdown", async () => {
    const exit = vi.fn();
    const onCleanup = vi.fn().mockResolvedValue(undefined);

    let completed = false;
    const shutdownPromise = startGracefulShutdown({
      deregistrationDelayMs: 50,
      drainTimeoutMs: 1000,
      onCleanup,
      exit,
    }).then(() => {
      completed = true;
    });

    expect(isShuttingDown()).toBe(true);
    expect(completed).toBe(false);

    await shutdownPromise;
    expect(completed).toBe(true);
    expect(onCleanup).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  test("startGracefulShutdown is idempotent on duplicate calls", async () => {
    const exit = vi.fn();
    const onCleanup = vi.fn().mockResolvedValue(undefined);

    const first = startGracefulShutdown({ onCleanup, exit });
    const second = startGracefulShutdown({ onCleanup, exit });

    await Promise.all([first, second]);
    expect(onCleanup).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  test("initGracefulShutdown registers signal listeners and unsubscribes cleanly", () => {
    const exit = vi.fn();
    const onCleanup = vi.fn();

    const cleanup = initGracefulShutdown({
      signals: ["SIGTERM"],
      onCleanup,
      exit,
    });

    expect(process.listenerCount("SIGTERM")).toBeGreaterThan(0);
    cleanup();
    expect(isShuttingDown()).toBe(false);
  });
});
