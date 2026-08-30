import { expect, test } from "@playwright/test";

const HOME_PATH = "/";

function getCspHeader(headers: Record<string, string>): string {
  return (
    headers["content-security-policy-report-only"] ??
    headers["content-security-policy"] ??
    ""
  );
}

test("home page emits a report-only CSP header", async ({ page }) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  const headers = response!.headers();
  const csp = getCspHeader(headers);

  expect(csp).toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain("report-uri");
});
