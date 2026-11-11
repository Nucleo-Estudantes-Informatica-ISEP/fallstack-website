import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([undefined, ""])(
  "uses the current origin when the API URL is %s",
  async (value) => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", value);
    expect((await import("./api")).BASE_URL).toBe("/api");
  }
);

test("preserves an explicitly configured API URL", async () => {
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://example.com/api");
  expect((await import("./api")).BASE_URL).toBe("https://example.com/api");
});
