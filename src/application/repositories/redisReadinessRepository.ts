import "server-only";

import { createClient } from "@redis/client";

import { getRedisUrl } from "@/config/env.redis";

export async function checkRedisReadiness(signal: AbortSignal) {
  const url = getRedisUrl();
  // Native development can omit Redis while no request flow depends on it.
  // Compose requires REDIS_URL, so deployed copies always test their connection.
  if (!url) return;

  const client = createClient({
    url,
    socket: { connectTimeout: 2000, reconnectStrategy: false },
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
