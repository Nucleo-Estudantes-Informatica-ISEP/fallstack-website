// @vitest-environment node
import { createServer, type Server, type Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, test, vi } from "vitest";

import { createRedisRateLimitStore } from "@/application/repositories/redisRateLimitRepository";

vi.mock("server-only", () => ({}));

let server: Server;
const sockets = new Set<Socket>();
const stores: ReturnType<typeof createRedisRateLimitStore>[] = [];
afterEach(async () => {
  stores.forEach((store) => store.close());
  stores.length = 0;
  for (const socket of sockets) socket.destroy();
  if (server?.listening)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  sockets.clear();
});

function command(
  input: string
): { args: string[]; consumed: number } | undefined {
  const header = input.indexOf("\r\n");
  if (header < 0) return;
  const args: string[] = [];
  let cursor = header + 2;
  for (let i = 0; i < Number(input.slice(1, header)); i++) {
    const end = input.indexOf("\r\n", cursor);
    if (end < 0) return;
    const length = Number(input.slice(cursor + 1, end));
    if (input.length < end + 2 + length + 2) return;
    args.push(input.slice(end + 2, end + 2 + length));
    cursor = end + 2 + length + 2;
  }
  return { args, consumed: cursor };
}

test.each([
  "hang-handshake",
  "hang-eval",
  "bad-auth",
  "oom",
  "disconnect",
  "bad-reply",
])(
  "real client has bounded %s failure, no mutation replay, closes sockets and recovers",
  async (initialMode) => {
    let mode = initialMode;
    let mutations = 0;
    let authenticated = false;
    server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      let input = "";
      socket.on("data", (bytes) => {
        input += bytes.toString();
        let parsed;
        while ((parsed = command(input))) {
          input = input.slice(parsed.consumed);
          if (mode === "hang-handshake") continue;
          const args = parsed.args;
          if (args[0] === "AUTH" || args[0] === "HELLO") {
            const offset = args.indexOf("AUTH");
            authenticated = args[offset + 2] === "synthetic-secret";
            socket.write(
              mode === "bad-auth"
                ? "-WRONGPASS private-provider-detail\r\n"
                : args[0] === "HELLO"
                  ? "%0\r\n"
                  : "+OK\r\n"
            );
          } else if (args[0] === "EVAL") {
            mutations++;
            if (mode === "hang-eval") continue;
            if (mode === "disconnect") {
              socket.destroy();
              continue;
            }
            socket.write(
              mode === "oom"
                ? "-OOM private-provider-detail\r\n"
                : mode === "bad-reply"
                  ? "+invalid\r\n"
                  : "*2\r\n:0\r\n:1234\r\n"
            );
          } else socket.write("+OK\r\n");
        }
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No loopback port");
    const store = createRedisRateLimitStore(() => ({
      url: `redis://default:synthetic-secret@127.0.0.1:${address.port}`,
      prefix: "fallstack:test:",
    }));
    stores.push(store);
    const started = performance.now();
    await expect(
      store.check("synthetic", { max: 5, windowMs: 60000 })
    ).rejects.toThrow("Shared rate limiter unavailable");
    expect(performance.now() - started).toBeLessThan(1000);
    const beforeRecovery = mutations;
    await expect(
      store.check("synthetic", { max: 5, windowMs: 60000 })
    ).rejects.toMatchObject({ reason: "cooldown" });
    expect(mutations).toBe(beforeRecovery);
    await vi.waitFor(() => expect(sockets.size).toBe(0));
    if (mode !== "hang-handshake") expect(authenticated).toBe(true);
    mode = "ready";
    await delay(1050);
    expect(await store.check("synthetic", { max: 5, windowMs: 60000 })).toEqual(
      { status: "limited", retryAfterMs: 1234 }
    );
    expect(mutations).toBe(beforeRecovery + 1);
  }
);

test("limits pending work and connection attempts during a hanging handshake", async () => {
  let connections = 0;
  server = createServer((socket) => {
    connections++;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.resume();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No loopback port");
  const store = createRedisRateLimitStore(
    () => ({
      url: `redis://:test@127.0.0.1:${address.port}`,
      prefix: "fallstack:test:",
    }),
    { deadlineMs: 100, connectTimeoutMs: 100, cooldownMs: 1000, maxPending: 2 }
  );
  stores.push(store);
  const work = Promise.allSettled([
    store.check("a", { max: 5, windowMs: 60000 }),
    store.check("b", { max: 5, windowMs: 60000 }),
  ]);
  await expect(
    store.check("c", { max: 5, windowMs: 60000 })
  ).rejects.toMatchObject({ reason: "saturated" });
  expect((await work).every((result) => result.status === "rejected")).toBe(
    true
  );
  expect(connections).toBe(1);
  await vi.waitFor(() => expect(sockets.size).toBe(0));
});
