import { expect, test } from "./fixtures";

const HOME_PATH = "/";

test("home page emits an enforced CSP header and removes report-only mode", async ({
  page,
}) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  const headers = response!.headers();

  expect(headers["content-security-policy"]).toBeTruthy();
  expect(headers["content-security-policy-report-only"]).toBeUndefined();

  const csp = headers["content-security-policy"];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("report-uri");
  expect(csp).not.toMatch(/svg/i);
});
