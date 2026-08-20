import { afterEach, beforeEach, expect, test, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("falls back to the Docker port when NEXT_PUBLIC_BASE_URL is empty", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.NEXT_PUBLIC_BASE_URL = "";

  const { clientEnv } = await import("./env.client");

  expect(clientEnv.NEXT_PUBLIC_BASE_URL).toBe("http://localhost:4000/api");
});

test("still requires a real NEXT_PUBLIC_SUPABASE_URL (no default)", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.NEXT_PUBLIC_BASE_URL = "";

  await expect(import("./env.client")).rejects.toThrow(
    /Invalid client environment variables/
  );
});
