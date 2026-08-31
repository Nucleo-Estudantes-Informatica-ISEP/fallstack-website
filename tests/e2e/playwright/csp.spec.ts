import { expect, test } from "@playwright/test";

const HOME_PATH = "/";

test("home page emits a report-only CSP header and rejects enforced headers", async ({
  page,
}) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  const headers = response!.headers();

  expect(headers["content-security-policy-report-only"]).toBeTruthy();
  expect(headers["content-security-policy"]).toBeUndefined();

  const csp = headers["content-security-policy-report-only"];

  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain("report-uri");
  expect(headers["content-security-policy"]).not.toBeTruthy();
});
