// @vitest-environment node

import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { assertStagingTarget } from "../stagingTarget";
import { checkHealth, readinessConfig, runReadiness } from "./readiness";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("node:fs", () => ({
  createWriteStream: () => ({ end: (callback?: () => void) => callback?.() }),
}));
vi.mock("node:fs/promises", () => ({
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

const config = {
  E2E_BASE_URL: "https://staging.example.org",
  STAGING_BASE_URL: "https://staging.example.org",
  CONFIRM_NON_PRODUCTION: "yes",
  E2E_STUDENT_STORAGE_STATE: "student.json",
  E2E_EMPLOYEE_STORAGE_STATE: "employee.json",
  E2E_ADMIN_STORAGE_STATE: "admin.json",
  E2E_SUPER_ADMIN_STORAGE_STATE: "super-admin.json",
  ACTION_ID: "synthetic-action",
};
const previousExitCode = process.exitCode;

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries(config)) vi.stubEnv(key, value);
  for (const key of [
    "READINESS_MUTATIONS",
    "READINESS_LOAD",
    "READINESS_RATE_LIMIT",
  ])
    vi.stubEnv(key, "no");
  vi.stubEnv("GITHUB_STEP_SUMMARY", "summary.md");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"status":200}'))
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.mocked(readFile).mockImplementation(async (path) =>
    String(path).endsWith("playwright.json")
      ? JSON.stringify({
          stats: {
            skipped: 0,
            expected: process.env.READINESS_MUTATIONS === "yes" ? 6 : 4,
          },
        })
      : JSON.stringify({ cookies: [], origins: [] })
  );
  vi.mocked(spawn).mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: { pipe: vi.fn() },
      stderr: { pipe: vi.fn() },
    });
    queueMicrotask(() => child.emit("close", 0));
    return child as unknown as ReturnType<typeof spawn>;
  });
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  process.exitCode = previousExitCode;
});

test.each([
  "https://fallstack.nei-isep.org",
  "https://example.org",
  "http://staging.example.org",
  "https://staging.example.org/path",
  "https://staging.example.org?target=production",
  "https://staging.example.org#fragment",
  "https://user:secret@staging.example.org",
  "https://staging.example.org@production.example.org",
])(
  "refuses unsafe target %s even with confirmation and matching approval",
  (target) => {
    expect(() => assertStagingTarget(target, target, "yes")).toThrow();
  }
);

test("requires approved origin and explicit confirmation", () => {
  expect(() =>
    assertStagingTarget(config.E2E_BASE_URL, "https://staging.other.org", "yes")
  ).toThrow(/match/);
  expect(() =>
    assertStagingTarget(config.E2E_BASE_URL, config.STAGING_BASE_URL, "no")
  ).toThrow(/CONFIRM/);
  expect(
    assertStagingTarget(
      `${config.E2E_BASE_URL}/`,
      config.STAGING_BASE_URL,
      "yes"
    )
  ).toBe(config.E2E_BASE_URL);
  expect(
    assertStagingTarget("http://127.0.0.1:3000", "http://127.0.0.1:3000", "yes")
  ).toBe("http://127.0.0.1:3000");
});

test("required credentials and opt-in cookie pool cannot silently skip", () => {
  expect(() =>
    readinessConfig({ ...config, E2E_ADMIN_STORAGE_STATE: undefined })
  ).toThrow();
  expect(() =>
    readinessConfig({ ...config, READINESS_RATE_LIMIT: "yes" })
  ).toThrow(/STUDENT_COOKIES/);
});

test.each([
  new Response('{"status":503}', { status: 503 }),
  new Response('{"status":503}', { status: 200 }),
  new Response("not json"),
])("health rejects unavailable or malformed deployments", async (response) => {
  vi.mocked(fetch).mockResolvedValue(response);
  await expect(checkHealth(config.E2E_BASE_URL)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledWith(
    `${config.E2E_BASE_URL}/api/health`,
    expect.objectContaining({ redirect: "error" })
  );
});

test("health failure stops Playwright and k6, retaining failed layer", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("staging unavailable"));
  await runReadiness();
  expect(spawn).not.toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/result.json",
    expect.stringContaining('"layer": "health"')
  );
  expect(appendFile).toHaveBeenCalledWith(
    "summary.md",
    expect.stringContaining("Staging readiness: FAIL")
  );
});

test("safe default reuses harnesses with bounded read-only smoke and ignores upload flags", async () => {
  vi.stubEnv("E2E_ALLOW_UPLOADS", "yes");
  vi.stubEnv("K6_ITERATIONS", "100000");
  await runReadiness();
  expect(process.exitCode).toBe(0);
  expect(spawn).toHaveBeenCalledTimes(3);
  const calls = vi.mocked(spawn).mock.calls;
  expect(calls[0][1]).toContain("--retries=0");
  expect(calls[0][1]?.join(" ")).not.toMatch(
    /employee scan persists|admin creates/
  );
  expect(calls[0][2]?.env?.E2E_ALLOW_UPLOADS).toBe("no");
  expect(calls[1][2]?.env).toMatchObject({
    K6_SCENARIO: "health",
    K6_PROFILE: "smoke",
  });
  expect(calls[1][2]?.env).not.toHaveProperty("K6_ITERATIONS");
  expect(calls[2][2]?.env).toMatchObject({
    K6_SCENARIO: "qr",
    K6_PROFILE: "smoke",
  });
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/summary.md",
    expect.stringContaining("Staging readiness: PASS")
  );
});

test("opt-ins select existing mutation, peak, and boundary scenarios", async () => {
  for (const key of [
    "READINESS_MUTATIONS",
    "READINESS_LOAD",
    "READINESS_RATE_LIMIT",
  ])
    vi.stubEnv(key, "yes");
  vi.stubEnv("STUDENT_COOKIES", "synthetic-cookie");
  await runReadiness();
  const calls = vi.mocked(spawn).mock.calls;
  expect(calls).toHaveLength(4);
  expect(calls[0][1]?.join(" ")).toMatch(
    /employee scan persists\|admin creates/
  );
  expect(calls[1][2]?.env?.K6_PROFILE).toBe("peak");
  expect(calls[3][2]?.env?.K6_SCENARIO).toBe("upload-tickets-boundary");
});

test("skipped required coverage fails Playwright layer before load", async () => {
  vi.mocked(readFile).mockImplementation(async (path) =>
    String(path).endsWith("playwright.json")
      ? JSON.stringify({ stats: { skipped: 1, expected: 3 } })
      : JSON.stringify({ cookies: [], origins: [] })
  );
  await runReadiness();
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBe(1);
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/result.json",
    expect.stringContaining('"layer": "playwright"')
  );
});

test("subprocess failure identifies k6 layer and halts later layers", async () => {
  vi.mocked(spawn).mockImplementation((command) => {
    const child = Object.assign(new EventEmitter(), {
      stdout: { pipe: vi.fn() },
      stderr: { pipe: vi.fn() },
    });
    queueMicrotask(() => child.emit("close", command === "k6" ? 99 : 0));
    return child as unknown as ReturnType<typeof spawn>;
  });
  await runReadiness();
  expect(spawn).toHaveBeenCalledTimes(2);
  expect(process.exitCode).toBe(1);
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/result.json",
    expect.stringContaining('"layer": "k6-health"')
  );
});

test("published text evidence redacts role sessions and load cookies", async () => {
  vi.stubEnv("STUDENT_COOKIES", "session=load-secret");
  vi.mocked(readFile).mockImplementation(async (path) => {
    if (String(path).endsWith("playwright.json"))
      return JSON.stringify({
        stats: { skipped: 0, expected: 4 },
        message: "role-secret",
      });
    if (String(path).endsWith(".log")) return "role-secret load-secret";
    return JSON.stringify({ cookies: [{ value: "role-secret" }], origins: [] });
  });
  await runReadiness();
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/evidence/playwright.json",
    expect.stringContaining('"message":"[REDACTED]"')
  );
  expect(writeFile).toHaveBeenCalledWith(
    "test-results/readiness/evidence/playwright.log",
    "[REDACTED] [REDACTED]"
  );
});

test("malformed session files fail configuration without exposing their contents", async () => {
  vi.mocked(readFile).mockResolvedValue("invalid JSON with secret-token");
  await runReadiness();
  expect(spawn).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith(
    expect.stringContaining("Cannot read valid Playwright storage state")
  );
  expect(console.error).not.toHaveBeenCalledWith(
    expect.stringContaining("secret-token")
  );
});
