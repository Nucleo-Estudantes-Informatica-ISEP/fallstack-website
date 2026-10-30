import "server-only";

import { createClient } from "@redis/client";

import { serverEnv } from "@/config/env.server";
import { checkDatabaseReadiness } from "@/application/repositories/readinessRepository";

const TIMEOUT_MS = 2000;
const CACHE_MS = 5000;
type Probe = (signal: AbortSignal) => Promise<void>;

async function checkHttpReadiness(url: URL, signal: AbortSignal) {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    redirect: "error",
  });
  // Health endpoints have no useful body; do not retain a streaming response.
  await response.body?.cancel();
  if (response.status !== 200) throw new Error("Dependency is not ready");
}

export async function checkRedisReadiness(signal: AbortSignal) {
  const url = serverEnv.REDIS_URL;
  // Native development can omit Redis while no request flow depends on it.
  // Compose requires REDIS_URL, so deployed copies always test their connection.
  if (!url) return;

  const client = createClient({
    url,
    socket: { connectTimeout: TIMEOUT_MS, reconnectStrategy: false },
    disableOfflineQueue: true,
  });
  // Connection failures are reported by the probe, never as unhandled events
  // or logs containing credentials/connection URLs.
  client.on("error", () => {});
  const destroy = () => {
    if (client.isOpen) client.destroy();
  };
  signal.throwIfAborted();
  signal.addEventListener("abort", destroy, { once: true });
  try {
    await client.connect();
    if ((await client.ping()) !== "PONG") throw new Error("Redis is not ready");
  } finally {
    signal.removeEventListener("abort", destroy);
    destroy();
  }
}

// Share probes across simultaneous requests and cache briefly to bound the cost
// of an unauthenticated endpoint. Retain unfinished work after a deadline so a
// stalled driver cannot accumulate more queries/connections on each request.
export function createReadinessCheck(probes: Probe[]) {
  let active: Promise<boolean> | undefined;
  let response: Promise<boolean> | undefined;
  let cached: { ready: boolean; expires: number } | undefined;

  return function readiness(): Promise<boolean> {
    if (cached && Date.now() < cached.expires)
      return Promise.resolve(cached.ready);
    if (response) return response;
    if (active) return Promise.resolve(false);

    const controller = new AbortController();
    const work = Promise.allSettled(
      probes.map((probe) =>
        Promise.resolve().then(() => probe(controller.signal))
      )
    ).then((results) =>
      results.every((result) => result.status === "fulfilled")
    );
    active = work;
    void work.then(() => {
      active = undefined;
    });
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    });
    response = Promise.race([work, deadline])
      .then((ready) => {
        cached = { ready, expires: Date.now() + CACHE_MS };
        return ready;
      })
      .finally(() => {
        clearTimeout(timer);
        controller.abort();
        response = undefined;
      });
    return response;
  };
}

export const isReady = createReadinessCheck([
  checkDatabaseReadiness,
  checkRedisReadiness,
  (signal) =>
    checkHttpReadiness(
      new URL("/minio/health/ready", serverEnv.S3_ENDPOINT),
      signal
    ),
  (signal) =>
    checkHttpReadiness(
      new URL("/debug/ready", serverEnv.AUTH_ISSUER_URL),
      signal
    ),
]);
