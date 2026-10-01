import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { z } from "zod";

import { assertStagingTarget } from "../stagingTarget";

const artifacts = "test-results/readiness";
const flag = z.enum(["yes", "no"]).default("no");
const envSchema = z.object({
  E2E_BASE_URL: z.url(),
  STAGING_BASE_URL: z.url(),
  CONFIRM_NON_PRODUCTION: z.literal("yes"),
  E2E_STUDENT_STORAGE_STATE: z.string().min(1),
  E2E_EMPLOYEE_STORAGE_STATE: z.string().min(1),
  E2E_ADMIN_STORAGE_STATE: z.string().min(1),
  E2E_SUPER_ADMIN_STORAGE_STATE: z.string().min(1),
  ACTION_ID: z.string().min(1),
  READINESS_MUTATIONS: flag,
  READINESS_LOAD: flag,
  READINESS_RATE_LIMIT: flag,
  STUDENT_COOKIES: z.string().optional(),
  GITHUB_STEP_SUMMARY: z.string().optional(),
});

export function readinessConfig(env: Record<string, string | undefined>) {
  const config = envSchema.parse(env);
  config.E2E_BASE_URL = assertStagingTarget(
    config.E2E_BASE_URL,
    config.STAGING_BASE_URL,
    config.CONFIRM_NON_PRODUCTION
  );
  if (config.READINESS_RATE_LIMIT === "yes" && !config.STUDENT_COOKIES)
    throw new Error(
      "Set STUDENT_COOKIES for the opt-in rate-limit upload probe."
    );
  return config;
}

export async function checkHealth(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/health`, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 200 || (await response.json()).status !== 200)
    throw new Error(`Health check failed (HTTP ${response.status}).`);
}

const safeSmokePattern =
  "health endpoint|home page emits|student QR code generated|boundaries hold";

export async function runReadiness() {
  await rm(artifacts, { recursive: true, force: true });
  await mkdir(artifacts, { recursive: true });
  const results: { layer: string; status: "PASS" | "FAIL" }[] = [];
  const secrets: string[] = [];
  let layer = "configuration";
  const run = (command: string, args: string[], env: NodeJS.ProcessEnv) =>
    new Promise<void>((resolve, reject) => {
      const log = createWriteStream(`${artifacts}/${layer}.log`);
      const child = spawn(command, args, {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.pipe(log, { end: false });
      child.stderr.pipe(log, { end: false });
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      child.on("error", (error) => {
        log.end();
        reject(error);
      });
      child.on("close", (code) => {
        log.end(() => {
          if (code === 0) resolve();
          else reject(new Error(`Command exited with ${code}.`));
        });
      });
    });
  const pass = () => results.push({ layer, status: "PASS" });

  try {
    const config = readinessConfig(process.env);
    for (const key of [
      "E2E_STUDENT_STORAGE_STATE",
      "E2E_EMPLOYEE_STORAGE_STATE",
      "E2E_ADMIN_STORAGE_STATE",
      "E2E_SUPER_ADMIN_STORAGE_STATE",
    ] as const) {
      let state;
      try {
        state = JSON.parse(await readFile(config[key], "utf8"));
      } catch {
        throw new Error(`Cannot read valid Playwright storage state: ${key}.`);
      }
      if (!Array.isArray(state.cookies) || !Array.isArray(state.origins))
        throw new Error(`Invalid Playwright storage state: ${key}.`);
      for (const cookie of state.cookies)
        if (typeof cookie.value === "string" && cookie.value)
          secrets.push(cookie.value);
    }
    for (const cookie of (config.STUDENT_COOKIES ?? "").split(/[;,]/)) {
      const value = cookie.slice(cookie.indexOf("=") + 1).trim();
      if (value) secrets.push(value);
    }
    pass();

    layer = "health";
    await checkHealth(config.E2E_BASE_URL);
    await writeFile(
      `${artifacts}/health.log`,
      "GET /api/health: HTTP 200, status 200\n"
    );
    pass();

    layer = "playwright";
    await run(
      "pnpm",
      [
        "test:e2e",
        "tests/e2e/playwright/health.spec.ts",
        "tests/e2e/playwright/csp.spec.ts",
        "tests/e2e/playwright/student-event-flow.spec.ts",
        "tests/e2e/playwright/event-role-flows.spec.ts",
        "--project=chromium",
        "--workers=1",
        "--retries=0",
        "--trace=retain-on-failure",
        "--reporter=line,json,html",
        `--output=${artifacts}/browser`,
        "--grep",
        config.READINESS_MUTATIONS === "yes"
          ? `${safeSmokePattern}|employee scan persists|admin creates`
          : safeSmokePattern,
      ],
      {
        ...process.env,
        ...config,
        E2E_ALLOW_UPLOADS: "no",
        E2E_VERIFY_UPLOAD_LIMITS: "no",
        PLAYWRIGHT_JSON_OUTPUT_FILE: `${artifacts}/playwright.json`,
        PLAYWRIGHT_HTML_OUTPUT_DIR: `${artifacts}/html`,
        PLAYWRIGHT_HTML_OPEN: "never",
      }
    );
    const report = JSON.parse(
      await readFile(`${artifacts}/playwright.json`, "utf8")
    );
    const requiredTests = config.READINESS_MUTATIONS === "yes" ? 6 : 4;
    if (report.stats.skipped || report.stats.expected !== requiredTests)
      throw new Error("Required smoke coverage was skipped or missing.");
    pass();

    const scenarios = ["health", "qr"];
    // k6's built-in env overrides can turn a smoke profile into a stress run.
    const loadEnv = { ...process.env };
    for (const key of Object.keys(loadEnv))
      if (key.startsWith("K6_")) delete loadEnv[key];
    if (config.READINESS_RATE_LIMIT === "yes")
      scenarios.push("upload-tickets-boundary");
    for (const scenario of scenarios) {
      const boundary = scenario === "upload-tickets-boundary";
      layer = boundary ? "k6-rate-limit" : `k6-${scenario}`;
      await run(
        "k6",
        [
          "run",
          `--summary-export=${artifacts}/${layer}.json`,
          "tests/load/event-readiness.js",
        ],
        {
          ...loadEnv,
          ...config,
          K6_SCENARIO: scenario,
          K6_PROFILE:
            boundary || config.READINESS_LOAD === "yes" ? "peak" : "smoke",
          // Fixed representative budget; ignore inherited stress overrides.
          VUS: "10",
          REQUEST_INTERVAL_SECONDS: "1",
          RATE_LIMIT_MAX: "5",
          RATE_LIMIT_WINDOW_MS: "60000",
        }
      );
      pass();
    }
  } catch (error) {
    results.push({ layer, status: "FAIL" });
    const message = error instanceof Error ? error.message : "Unknown failure";
    await appendFile(`${artifacts}/${layer}.log`, `${message}\n`);
    console.error(`Readiness FAIL [${layer}]: ${message}`);
    process.exitCode = 1;
  } finally {
    const evidence = `${artifacts}/evidence`;
    await mkdir(evidence, { recursive: true });
    // Only these text files are publishable; raw traces/HTML contain session headers.
    for (const file of [
      ...results.map((result) => `${result.layer}.log`),
      "playwright.json",
      ...results
        .filter((result) => result.layer.startsWith("k6-"))
        .map((result) => `${result.layer}.json`),
    ]) {
      const path = `${artifacts}/${file}`;
      let contents = await readFile(path, "utf8").catch(() => undefined);
      if (contents === undefined) continue;
      for (const secret of secrets)
        contents = contents.split(secret).join("[REDACTED]");
      await writeFile(`${evidence}/${file}`, contents);
    }
    const status = results.some((result) => result.status === "FAIL")
      ? "FAIL"
      : "PASS";
    const summary = `# Staging readiness: ${status}\n\n| Layer | Result |\n| --- | --- |\n${results.map((result) => `| ${result.layer} | ${result.status} |`).join("\n")}\n\nLater layers are not run after a failure.\n`;
    await writeFile(`${artifacts}/summary.md`, summary);
    await writeFile(`${evidence}/summary.md`, summary);
    await writeFile(
      `${artifacts}/result.json`,
      JSON.stringify({ status, results }, null, 2)
    );
    await writeFile(
      `${evidence}/result.json`,
      JSON.stringify({ status, results }, null, 2)
    );
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(`Readiness ${status}; artifacts: ${artifacts}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void runReadiness();
