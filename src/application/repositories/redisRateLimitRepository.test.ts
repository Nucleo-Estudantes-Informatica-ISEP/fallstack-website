// @vitest-environment node
import { createClient, ErrorReply } from "@redis/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createRedisRateLimitStore } from "./redisRateLimitRepository";

vi.mock("server-only", () => ({}));
vi.mock("@redis/client", async (original) => ({
  ...(await original<typeof import("@redis/client")>()),
  createClient: vi.fn(),
}));

function clientFixture() {
  const client = {
    isOpen: false,
    isReady: false,
    on: vi.fn(),
    connect: vi.fn(async () => {
      client.isOpen = true;
      client.isReady = true;
    }),
    eval: vi.fn().mockResolvedValue([1, 0]),
    destroy: vi.fn(() => {
      client.isOpen = false;
      client.isReady = false;
    }),
  };
  return client;
}
const clients: ReturnType<typeof clientFixture>[] = [];
const stores: ReturnType<typeof createRedisRateLimitStore>[] = [];
const policy = { max: 5, windowMs: 60000 };
beforeEach(() => {
  clients.length = 0;
  vi.mocked(createClient).mockImplementation(() => {
    const client = clientFixture();
    clients.push(client);
    return client as never;
  });
});
afterEach(() => {
  stores.forEach((store) => store.close());
  stores.length = 0;
});
const storeFixture = () => {
  const store = createRedisRateLimitStore(() => ({
    url: "redis://localhost",
    prefix: "fallstack:test:",
  }));
  stores.push(store);
  return store;
};

test("replaces an idle disconnected client before admission without imposing cooldown", async () => {
  const store = storeFixture();
  await expect(store.check("first", policy)).resolves.toEqual({
    status: "allowed",
  });
  clients[0].isOpen = false;
  clients[0].isReady = false;
  await expect(store.check("after-idle-drop", policy)).resolves.toEqual({
    status: "allowed",
  });
  await expect(store.check("another-user", policy)).resolves.toEqual({
    status: "allowed",
  });
  expect(clients).toHaveLength(2);
  expect(clients[1].connect).toHaveBeenCalledTimes(1);
});

test.each([
  "INVALID_LIMITER_STATE",
  "WRONGTYPE invalid key",
  "OOM command rejected",
])(
  "server reply %s isolates failure without destroying a healthy client",
  async (message) => {
    const store = storeFixture();
    await store.check("healthy", policy);
    clients[0].eval.mockRejectedValueOnce(new ErrorReply(message));
    await expect(store.check("broken", policy)).rejects.toThrow(
      "Shared rate limiter unavailable"
    );
    await expect(store.check("other-user", policy)).resolves.toEqual({
      status: "allowed",
    });
    expect(clients).toHaveLength(1);
    expect(clients[0].destroy).not.toHaveBeenCalled();
    expect(clients[0].eval).toHaveBeenCalledTimes(3);
  }
);

test("authentication errors still close the connection and impose cooldown", async () => {
  vi.mocked(createClient).mockImplementationOnce(() => {
    const client = clientFixture();
    client.connect.mockRejectedValueOnce(
      new ErrorReply("WRONGPASS credentials rejected")
    );
    clients.push(client);
    return client as never;
  });
  const store = storeFixture();
  await expect(store.check("user", policy)).rejects.toThrow(
    "Shared rate limiter unavailable"
  );
  await expect(store.check("other-user", policy)).rejects.toMatchObject({
    reason: "cooldown",
  });
  expect(clients[0].eval).not.toHaveBeenCalled();
});
