import "server-only";

import { subscribe, unsubscribe } from "node:diagnostics_channel";
import type {
  IncomingMessage,
  OutgoingHttpHeader,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";

import logger from "@/lib/logger";
import { disconnectDatabase } from "@/application/repositories/readinessRepository";

let shuttingDown = false;
let activeRequests = 0;
let isSubscribed = false;
let drainResolvers: Array<() => void> = [];

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function setShuttingDown(value: boolean): void {
  shuttingDown = value;
}

export function getActiveRequestCount(): number {
  return activeRequests;
}

export function incrementActiveRequests(): number {
  activeRequests += 1;
  return activeRequests;
}

export function decrementActiveRequests(): number {
  if (activeRequests > 0) {
    activeRequests -= 1;
  }
  if (activeRequests === 0) {
    const resolvers = drainResolvers;
    drainResolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
  return activeRequests;
}

export const DEFAULT_DEREGISTRATION_DELAY_MS =
  process.env.NODE_ENV === "test" ? 0 : 5000;
export const DEFAULT_DRAIN_TIMEOUT_MS = 25000;

export function resetShutdownState(): void {
  shuttingDown = false;
  activeRequests = 0;
  drainResolvers = [];
}

export function isHealthOrReadinessProbe(url?: string): boolean {
  if (!url) return false;
  try {
    const path = new URL(url, "http://localhost").pathname.replace(/\/+$/, "");
    return (
      path === "/api/health" ||
      path === "/api/ready" ||
      path === "/api/proxy-ready" ||
      path === "/metrics"
    );
  } catch {
    return false;
  }
}

function injectConnectionClose(
  headers: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined
): OutgoingHttpHeaders | OutgoingHttpHeader[] {
  if (Array.isArray(headers)) {
    const sanitized: OutgoingHttpHeader[] = [];
    for (let i = 0; i < headers.length; i += 2) {
      if (String(headers[i]).toLowerCase() !== "connection") {
        sanitized.push(headers[i], headers[i + 1]);
      }
    }
    sanitized.push("Connection", "close");
    return sanitized;
  }
  if (headers && typeof headers === "object") {
    const sanitized: OutgoingHttpHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== "connection") {
        sanitized[key] = value;
      }
    }
    sanitized["Connection"] = "close";
    return sanitized;
  }
  return { Connection: "close" };
}

export function handleRequestStart(message: unknown): void {
  const { request, response } = message as {
    request: IncomingMessage;
    response: ServerResponse;
  };

  // Skip internal private metrics listener requests (port 9464)
  if (request.socket?.localPort === 9464) {
    return;
  }

  // Health and readiness probes do not count as active user requests for draining
  if (isHealthOrReadinessProbe(request.url)) {
    return;
  }

  incrementActiveRequests();

  // If shutdown is active or begins while this request is in flight, signal client to close connection
  const originalWriteHead = response.writeHead;
  response.writeHead = function (
    this: ServerResponse,
    ...args: [
      number,
      ...(string | OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined)[],
    ]
  ) {
    if (shuttingDown && !this.headersSent) {
      try {
        this.setHeader("Connection", "close");
      } catch {
        // Headers might already be sent or immutable
      }

      if (args.length === 1) {
        args.push({ Connection: "close" });
      } else if (args.length === 2) {
        if (typeof args[1] === "string") {
          args.push({ Connection: "close" });
        } else {
          args[1] = injectConnectionClose(
            args[1] as OutgoingHttpHeaders | OutgoingHttpHeader[]
          );
        }
      } else if (args.length >= 3) {
        args[2] = injectConnectionClose(
          args[2] as OutgoingHttpHeaders | OutgoingHttpHeader[]
        );
      }
    }
    return (
      originalWriteHead as (...params: unknown[]) => ServerResponse
    ).apply(this, args);
  } as typeof response.writeHead;

  let finished = false;
  const onFinish = () => {
    if (finished) return;
    finished = true;
    response.off("finish", onFinish);
    response.off("close", onFinish);
    decrementActiveRequests();
  };

  response.once("finish", onFinish);
  response.once("close", onFinish);
}

export function startTrackingRequests(): void {
  if (isSubscribed) return;
  subscribe("http.server.request.start", handleRequestStart);
  isSubscribed = true;
}

export function stopTrackingRequests(): void {
  if (!isSubscribed) return;
  unsubscribe("http.server.request.start", handleRequestStart);
  isSubscribed = false;
}

export function waitForActiveRequests(timeoutMs = 25000): Promise<boolean> {
  if (activeRequests === 0) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      const idx = drainResolvers.indexOf(onDrain);
      if (idx !== -1) {
        drainResolvers.splice(idx, 1);
      }
      resolve(false);
    }, timeoutMs);

    const onDrain = () => {
      clearTimeout(timer);
      resolve(true);
    };

    drainResolvers.push(onDrain);
  });
}

export async function startGracefulShutdown(options?: {
  deregistrationDelayMs?: number;
  drainTimeoutMs?: number;
  onCleanup?: () => Promise<void> | void;
  exit?: (code: number) => void;
}): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(
    { activeRequests },
    "Graceful shutdown initiated. Unready copies get no traffic; finishing active requests first."
  );

  const deregistrationDelay =
    options?.deregistrationDelayMs ?? DEFAULT_DEREGISTRATION_DELAY_MS;
  if (deregistrationDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, deregistrationDelay));
  }

  const drained = await waitForActiveRequests(
    options?.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS
  );
  if (!drained) {
    logger.warn(
      { activeRequests },
      "Drain timeout reached while stopping; proceeding with cleanup."
    );
  } else {
    logger.info("All active requests finished successfully.");
  }

  if (options?.onCleanup) {
    try {
      await options.onCleanup();
    } catch (err) {
      logger.error({ err }, "Error executing shutdown cleanup handler");
    }
  } else {
    try {
      await disconnectDatabase();
    } catch (err) {
      logger.error({ err }, "Error disconnecting database during shutdown");
    }
  }

  const exitFn = options?.exit ?? process.exit;
  exitFn(0);
}

export function initGracefulShutdown(options?: {
  signals?: NodeJS.Signals[];
  deregistrationDelayMs?: number;
  drainTimeoutMs?: number;
  onCleanup?: () => Promise<void> | void;
  exit?: (code: number) => void;
}): () => void {
  startTrackingRequests();
  const signals = options?.signals ?? ["SIGTERM", "SIGINT"];
  const handler = () => {
    void startGracefulShutdown(options);
  };

  for (const sig of signals) {
    process.on(sig, handler);
  }

  return () => {
    stopTrackingRequests();
    for (const sig of signals) {
      process.off(sig, handler);
    }
    resetShutdownState();
  };
}
