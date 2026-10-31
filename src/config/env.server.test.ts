import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const originalEnv = { ...process.env };
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});
afterEach(() => {
  process.env = { ...originalEnv };
});

test.each([undefined, "", "false", "true"])(
  "parses never-enabled declaration %s without truthy-string coercion",
  async (value) => {
    if (value === undefined) delete process.env.GOOGLE_WALLET_NEVER_ENABLED;
    else process.env.GOOGLE_WALLET_NEVER_ENABLED = value;
    const { serverEnv } = await import("./env.server");
    expect(serverEnv.GOOGLE_WALLET_NEVER_ENABLED).toBe(value === "true");
  }
);

test("rejects an ambiguous never-enabled declaration", async () => {
  process.env.GOOGLE_WALLET_NEVER_ENABLED = "yes";
  const { serverEnv } = await import("./env.server");
  expect(() => serverEnv.GOOGLE_WALLET_NEVER_ENABLED).toThrow(
    "GOOGLE_WALLET_NEVER_ENABLED"
  );
});

test("an empty Wallet flag does not break unrelated server configuration", async () => {
  process.env.GOOGLE_WALLET_NEVER_ENABLED = "";
  const { serverEnv } = await import("./env.server");
  expect(serverEnv.AUTH_SECRET).toBe(process.env.AUTH_SECRET);
  expect(serverEnv.GOOGLE_WALLET_NEVER_ENABLED).toBe(false);
});

test.each([
  undefined,
  "",
  "redis://default:secret@redis:6379",
  "rediss://default:secret@redis:6380",
])("accepts optional Redis readiness URL %s", async (value) => {
  if (value === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = value;
  const { getRedisUrl } = await import("./env.redis");
  expect(getRedisUrl()).toBe(value || undefined);
});

test.each(["http://redis:6379", "not-a-url"])(
  "rejects invalid Redis URL %s",
  async (value) => {
    process.env.REDIS_URL = value;
    const { serverEnv } = await import("./env.server");
    const { getRedisUrl } = await import("./env.redis");
    expect(serverEnv.AUTH_SECRET).toBe(process.env.AUTH_SECRET);
    expect(() => getRedisUrl()).toThrow("REDIS_URL");
  }
);
