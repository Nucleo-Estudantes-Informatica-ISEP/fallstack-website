import { defineConfig, devices } from "@playwright/test";

import { e2eEnv } from "./tests/e2e/env";

const baseURL = (e2eEnv.baseUrl ?? "http://127.0.0.1:3000").replace(/\/$/, "");

export default defineConfig({
  testDir: "./tests/e2e/playwright",
  fullyParallel: true,
  forbidOnly: e2eEnv.ci,
  retries: e2eEnv.ci ? 2 : 0,
  reporter: e2eEnv.ci ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: e2eEnv.baseUrl
    ? undefined
    : {
        command: "pnpm exec next dev -H 127.0.0.1",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !e2eEnv.ci,
        timeout: 120_000,
      },
});
