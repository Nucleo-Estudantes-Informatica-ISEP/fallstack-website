// @vitest-environment node
import { createServer, type Server, type Socket } from "node:net";
import { afterEach, expect, test, vi } from "vitest";

import { checkRedisReadiness } from "@/application/repositories/redisReadinessRepository";

vi.mock("server-only", () => ({}));
const env = vi.hoisted(() => ({ REDIS_URL: "" }));
vi.mock("@/config/env.redis", () => ({ getRedisUrl: () => env.REDIS_URL }));
vi.mock("@/application/repositories/readinessRepository", () => ({
  checkDatabaseReadiness: vi.fn(),
}));

const sockets = new Set<Socket>();
let server: Server;
afterEach(async () => {
  for (const socket of sockets) socket.destroy();
  if (server?.listening)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  sockets.clear();
});

// Minimal loopback RESP fixture, not a live Redis or an application-client mock.
// Decode only the arrays of bulk strings sent by the actual installed client.
function command(
  input: string
): { args: string[]; consumed: number } | undefined {
  const headerEnd = input.indexOf("\r\n");
  if (headerEnd < 0) return;
  const count = Number(input.slice(1, headerEnd));
  const args: string[] = [];
  let cursor = headerEnd + 2;
  for (let index = 0; index < count; index++) {
    const end = input.indexOf("\r\n", cursor);
    if (end < 0) return;
    const length = Number(input.slice(cursor + 1, end));
    if (input.length < end + 2 + length + 2) return;
    args.push(input.slice(end + 2, end + 2 + length));
    cursor = end + 2 + length + 2;
  }
  return { args, consumed: cursor };
}

test.each(["ready", "bad-auth", "hang-handshake", "hang-ping"])(
  "real Redis client authenticates and releases sockets: %s",
  async (mode) => {
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
          if (args[0] === "HELLO" || args[0] === "AUTH") {
            const authIndex = args.indexOf("AUTH");
            authenticated =
              args[authIndex + 1] === "default" &&
              args[authIndex + 2] === "synthetic-secret";
            socket.write(
              mode === "bad-auth" || !authenticated
                ? "-WRONGPASS invalid credentials\r\n"
                : args[0] === "HELLO"
                  ? "%0\r\n"
                  : "+OK\r\n"
            );
          } else if (args[0] === "PING") {
            if (mode !== "hang-ping") socket.write("+PONG\r\n");
          } else {
            socket.write("+OK\r\n");
          }
        }
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No loopback port");
    env.REDIS_URL = `redis://default:synthetic-secret@127.0.0.1:${address.port}`;
    const check = checkRedisReadiness(AbortSignal.timeout(250));
    if (mode === "ready") await expect(check).resolves.toBeUndefined();
    else await expect(check).rejects.toThrow();
    if (mode !== "hang-handshake") expect(authenticated).toBe(true);
    await vi.waitFor(() => expect(sockets.size).toBe(0));
  }
);
