// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const startMetricsServer = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureRequestError: vi.fn() }));
vi.mock("../sentry.server.config", () => ({}));
vi.mock("./lib/metrics", () => ({ startMetricsServer }));

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("METRICS_ENABLED", "true");
  vi.stubEnv("METRICS_ENVIRONMENT", "dev");
  vi.stubEnv("METRICS_HOST", "127.0.0.1");
  startMetricsServer.mockReset().mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  delete (
    globalThis as typeof globalThis & { fallstackMetrics?: Promise<unknown> }
  ).fallstackMetrics;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

const failureMessage =
  "Metrics disabled: invalid configuration or private port 9464 unavailable.";

test.each([
  ["METRICS_ENVIRONMENT", undefined],
  ["METRICS_ENVIRONMENT", "FAKE_PRIVATE_VALUE"],
  ["METRICS_HOST", "localhost"],
  ["METRICS_ENABLED", "tru"],
] as const)("invalid %s does not prevent web startup", async (name, value) => {
  vi.stubEnv(name, value);
  const { register } = await import("./instrumentation");
  await expect(register()).resolves.toBeUndefined();
  expect(startMetricsServer).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledExactlyOnceWith(failureMessage);
});

test("listener failure does not prevent web startup or log error details", async () => {
  startMetricsServer.mockRejectedValue(new Error("FAKE_PRIVATE_BIND_ERROR"));
  const { register } = await import("./instrumentation");
  await expect(register()).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledExactlyOnceWith(failureMessage);
});

test("repeated registration starts only one listener", async () => {
  const { register } = await import("./instrumentation");
  await register();
  await register();
  expect(startMetricsServer).toHaveBeenCalledExactlyOnceWith({
    host: "127.0.0.1",
    port: 9464,
    environment: "dev",
  });
  expect(console.error).not.toHaveBeenCalled();
});

test("disabled metrics do not start a listener", async () => {
  vi.stubEnv("METRICS_ENABLED", "false");
  const { register } = await import("./instrumentation");
  await register();
  expect(startMetricsServer).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});
