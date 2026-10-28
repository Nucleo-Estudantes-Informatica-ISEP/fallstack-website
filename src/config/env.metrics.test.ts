import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("disabled metrics accept an empty deployment value and default to loopback", async () => {
  vi.stubEnv("METRICS_ENABLED", "false");
  vi.stubEnv("METRICS_ENVIRONMENT", "");
  vi.stubEnv("METRICS_HOST", undefined);
  expect((await import("./env.metrics")).metricsEnv.METRICS_HOST).toBe(
    "127.0.0.1"
  );
});

test.each(["", "production", "staging"])(
  "enabled metrics reject ambiguous environment %s",
  async (value) => {
    vi.stubEnv("METRICS_ENABLED", "true");
    vi.stubEnv("METRICS_ENVIRONMENT", value);
    await expect(import("./env.metrics")).rejects.toThrow();
  }
);

test.each(["dev", "main"])(
  "enabled metrics accept explicit %s",
  async (value) => {
    vi.stubEnv("METRICS_ENABLED", "true");
    vi.stubEnv("METRICS_ENVIRONMENT", value);
    expect((await import("./env.metrics")).metricsEnv.METRICS_ENVIRONMENT).toBe(
      value
    );
  }
);
