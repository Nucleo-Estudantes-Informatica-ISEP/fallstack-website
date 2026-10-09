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

test.each([undefined, "false", "true"])(
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
