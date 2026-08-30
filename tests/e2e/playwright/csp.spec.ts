import { expect, test } from "@playwright/test";

const DEV_CSP_REPORT_PATH = "/api/csp-report";
const HOME_PATH = "/";

function getCspHeader(headers: Record<string, string>): string {
  return (
    headers["content-security-policy-report-only"] ??
    headers["content-security-policy"] ??
    ""
  );
}

test("development report endpoint is reachable and returns diagnostics", async ({
  page,
}) => {
  const response = await page.goto(DEV_CSP_REPORT_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  await expect(response!.json()).resolves.toMatchObject({
    status: "ok",
    environment: "development",
  });
});

test("home page emits the CSP header during local development", async ({
  page,
}) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  const headers = response!.headers();
  const csp = getCspHeader(headers);

  expect(csp).toBeTruthy();
  expect(csp).toContain("default-src 'self'");
});
