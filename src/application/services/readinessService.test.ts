// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  checkRedisReadiness,
  createReadinessCheck,
  isReady,
} from "./readinessService";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => {
  const client = {
    connect: vi.fn(),
    ping: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    isOpen: false,
  };
  return {
    client,
    createClient: vi.fn(() => client),
    database: vi.fn(),
    env: {
      REDIS_URL: "redis://default:secret@redis.test:6379",
      S3_ENDPOINT: "http://minio.test:9000",
      AUTH_ISSUER_URL: "https://auth.test",
    },
  };
});
vi.mock("@redis/client", () => ({ createClient: mocks.createClient }));
vi.mock("@/config/env.server", () => ({ serverEnv: mocks.env }));
vi.mock("@/application/repositories/readinessRepository", () => ({
  checkDatabaseReadiness: mocks.database,
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  mocks.env.REDIS_URL = "redis://default:secret@redis.test:6379";
  mocks.client.isOpen = false;
  mocks.client.connect.mockImplementation(async () => {
    mocks.client.isOpen = true;
  });
  mocks.client.destroy.mockImplementation(() => {
    mocks.client.isOpen = false;
  });
  mocks.client.ping.mockResolvedValue("PONG");
  mocks.database.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("shares simultaneous probes, caches briefly, and detects failure and recovery", async () => {
  const dependency = vi.fn().mockResolvedValue(undefined);
  const ready = createReadinessCheck([dependency]);
  await expect(Promise.all([ready(), ready(), ready()])).resolves.toEqual([
    true,
    true,
    true,
  ]);
  await expect(ready()).resolves.toBe(true);
  expect(dependency).toHaveBeenCalledTimes(1);

  dependency.mockRejectedValue(new Error("credentials must not escape"));
  await vi.advanceTimersByTimeAsync(5000);
  await expect(ready()).resolves.toBe(false);
  dependency.mockResolvedValue(undefined);
  await vi.advanceTimersByTimeAsync(5000);
  await expect(ready()).resolves.toBe(true);
});

test("deadline aborts I/O and stalled work cannot accumulate across requests", async () => {
  let finish!: () => void;
  let signal!: AbortSignal;
  const dependency = vi.fn((probeSignal: AbortSignal) => {
    signal = probeSignal;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const ready = createReadinessCheck([dependency]);
  const response = ready();
  await vi.advanceTimersByTimeAsync(1999);
  expect(signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expect(response).resolves.toBe(false);
  expect(signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(5000);
  await expect(ready()).resolves.toBe(false);
  expect(dependency).toHaveBeenCalledTimes(1);

  finish();
  await vi.advanceTimersByTimeAsync(0);
  dependency.mockResolvedValue(undefined);
  await expect(ready()).resolves.toBe(true);
});

test("synchronous probe/configuration errors also fail readiness", async () => {
  const ready = createReadinessCheck([
    () => {
      throw new Error("bad URL");
    },
  ]);
  await expect(ready()).resolves.toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

test("Redis authenticates through the configured URL and closes its socket", async () => {
  await checkRedisReadiness(new AbortController().signal);
  expect(mocks.createClient).toHaveBeenCalledWith({
    url: mocks.env.REDIS_URL,
    socket: { connectTimeout: 2000, reconnectStrategy: false },
    disableOfflineQueue: true,
  });
  expect(mocks.client.ping).toHaveBeenCalledOnce();
  expect(mocks.client.destroy).toHaveBeenCalledOnce();
});

test.each(["NOAUTH Authentication required.", "not PONG", "PONG\nextra"])(
  "Redis rejects non-exact PONG: %s",
  async (reply) => {
    mocks.client.ping.mockResolvedValue(reply);
    await expect(
      checkRedisReadiness(new AbortController().signal)
    ).rejects.toThrow();
    expect(mocks.client.destroy).toHaveBeenCalledOnce();
  }
);

test("aborting a stalled Redis handshake destroys the connecting socket", async () => {
  mocks.client.connect.mockImplementation(() => {
    mocks.client.isOpen = true;
    return new Promise<void>((_resolve, reject) => {
      mocks.client.destroy.mockImplementation(() => {
        mocks.client.isOpen = false;
        reject(new Error("closed"));
      });
    });
  });
  const controller = new AbortController();
  const check = checkRedisReadiness(controller.signal);
  const rejected = expect(check).rejects.toThrow("closed");
  controller.abort();
  await rejected;
  expect(mocks.client.destroy).toHaveBeenCalledOnce();
});

test("native development may omit unused Redis", async () => {
  mocks.env.REDIS_URL = "";
  await checkRedisReadiness(new AbortController().signal);
  expect(mocks.createClient).not.toHaveBeenCalled();
});

test("HTTP checks use readiness paths, reject redirects, discard bodies and fail on non-200", async () => {
  const cancel = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockResolvedValue({ status: 200, body: { cancel } });
  vi.stubGlobal("fetch", fetch);
  await expect(isReady()).resolves.toBe(true);
  expect(fetch).toHaveBeenCalledWith(
    new URL("http://minio.test:9000/minio/health/ready"),
    {
      signal: expect.any(AbortSignal),
      cache: "no-store",
      redirect: "error",
    }
  );
  expect(fetch).toHaveBeenCalledWith(
    new URL("https://auth.test/debug/ready"),
    expect.any(Object)
  );
  expect(cancel).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(5000);
  fetch.mockResolvedValue({ status: 503, body: { cancel } });
  await expect(isReady()).resolves.toBe(false);
});
