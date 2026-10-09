// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  disconnect: vi.fn(),
  write: vi.fn(),
  rm: vi.fn(),
  args: { daemon: true } as { daemon?: boolean },
}));
vi.mock("../src/application/services/storageCleanupService", () => ({
  runStorageCleanup: mocks.run,
}));
vi.mock("../src/application/repositories/storageCleanupRepository", () => ({
  disconnectStorageCleanup: mocks.disconnect,
}));
vi.mock("../src/config/env.storage", () => ({ cleanupMode: () => "dry-run" }));
vi.mock("node:fs/promises", () => ({ writeFile: mocks.write, rm: mocks.rm }));
vi.mock("node:util", async (original) => ({
  ...(await original<object>()),
  parseArgs: () => ({ values: mocks.args }),
}));
const exitCode = process.exitCode;
let stop: () => void;
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.args = { daemon: true };
  vi.spyOn(process, "on").mockImplementation((signal, listener) => {
    if (signal === "SIGTERM") stop = listener;
    return process;
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.write.mockImplementation(async () => stop());
  mocks.rm.mockImplementation(async () => stop());
});
afterEach(() => {
  process.exitCode = exitCode;
  vi.restoreAllMocks();
});
test("completed pass retains heartbeat despite data warnings and retryable failed deletes", async () => {
  mocks.run.mockResolvedValue({
    failed: 1,
    unknownAge: 1,
    unknownReference: 1,
  });
  await import("./storage-cleanup");
  await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
  expect(mocks.write).toHaveBeenCalled();
  expect(mocks.rm).not.toHaveBeenCalled();
});
test("run failure removes heartbeat; SIGTERM reaches the active S3 signal", async () => {
  mocks.run.mockImplementation(async ({ signal }) => {
    stop();
    expect(signal.aborted).toBe(true);
    signal.throwIfAborted();
  });
  await import("./storage-cleanup");
  await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
  expect(mocks.rm).toHaveBeenCalled();
  expect(mocks.write).not.toHaveBeenCalled();
});
test("one-shot data warnings do not report a failed run", async () => {
  mocks.args = {};
  mocks.run.mockResolvedValue({
    failed: 0,
    unknownAge: 1,
    unknownReference: 1,
  });
  await import("./storage-cleanup");
  await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
  expect(process.exitCode).toBe(exitCode);
});
test("one-shot failed deletions still exit nonzero", async () => {
  mocks.args = {};
  mocks.run.mockResolvedValue({
    failed: 1,
    unknownAge: 0,
    unknownReference: 0,
  });
  await import("./storage-cleanup");
  await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
  expect(process.exitCode).toBe(1);
});
