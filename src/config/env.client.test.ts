import { afterEach, beforeEach, expect, test, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("falls back to the native Next dev port when NEXT_PUBLIC_BASE_URL is empty", async () => {
  process.env.NEXT_PUBLIC_BASE_URL = "";

  const { clientEnv } = await import("./env.client");

  expect(clientEnv.NEXT_PUBLIC_BASE_URL).toBe("http://localhost:3000/api");
});

test("rejects an invalid NEXT_PUBLIC_BASE_URL", async () => {
  process.env.NEXT_PUBLIC_BASE_URL = "not-a-url";

  await expect(import("./env.client")).rejects.toThrow(
    /Invalid client environment variables/
  );
});
