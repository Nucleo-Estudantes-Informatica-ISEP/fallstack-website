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

test("X-Frame-Options is DENY, consistent with frame-ancestors 'none'", async ({
  page,
}) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  const headers = response!.headers();

  // Both the legacy header and the CSP directive must deny framing.
  // SAMEORIGIN would contradict frame-ancestors 'none'.
  expect(headers["x-frame-options"]).toBe("DENY");
});

test("critical public pages load without CSP violations under enforcement", async ({
  page,
}) => {
  const violations: string[] = [];

  // Capture any CSP violation reports that reach the console as errors.
  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      msg.text().toLowerCase().includes("content security policy")
    ) {
      violations.push(msg.text());
    }
  });

  // Capture network-level CSP violation events (securitypolicyviolation).
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(
        `[CSP] blocked-uri=${e.blockedURI} directive=${e.effectiveDirective}`
      );
    });
  });

  const criticalPaths = [
    "/", // home / landing
    "/companies", // company listings (loads logos, YouTube embeds)
    "/schedule", // schedule page
    "/faq", // FAQ page
  ];

  for (const path of criticalPaths) {
    violations.length = 0;
    await page.goto(path);
    // Allow any deferred resources to settle.
    await page.waitForLoadState("networkidle");

    expect(
      violations,
      `CSP violations on ${path}: ${violations.join("; ")}`
    ).toHaveLength(0);
  }
});
