import { expect, test } from "./fixtures";

const HOME_PATH = "/";

function parseDirectives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    map.set(name, values);
  }
  return map;
}

test("home page emits an enforced CSP header with per-request nonce and removes report-only mode", async ({
  page,
}) => {
  const response = await page.goto(HOME_PATH);

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  const headers = response!.headers();

  expect(headers["content-security-policy"]).toBeTruthy();
  expect(headers["content-security-policy-report-only"]).toBeUndefined();

  const csp = headers["content-security-policy"];
  const directives = parseDirectives(csp);

  expect(directives.get("default-src")).toEqual(["'self'"]);

  const scriptSrc = directives.get("script-src") ?? [];
  expect(scriptSrc).toContain("'self'");
  expect(scriptSrc.some((val) => /^'nonce-[A-Za-z0-9+/=]+'$/.test(val))).toBe(
    true
  );
  expect(scriptSrc).toContain("'strict-dynamic'");
  expect(scriptSrc).not.toContain("'unsafe-inline'");

  expect(directives.get("object-src")).toEqual(["'none'"]);
  expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
  expect(directives.get("frame-src")).toEqual(["https://www.youtube.com"]);
  expect(directives.get("img-src")).toEqual(["'self'", "data:", "blob:"]);

  const imgSrcValues = directives.get("img-src") ?? [];
  expect(imgSrcValues.some((v) => v.toLowerCase().includes("svg"))).toBe(false);

  expect(csp).not.toContain("report-uri");
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

test("critical public and guest routes load without CSP violations under enforcement", async ({
  page,
}) => {
  interface CspViolation {
    blockedURI: string;
    effectiveDirective: string;
    violatedDirective: string;
  }

  const violations: CspViolation[] = [];

  // Expose clean callback to avoid console parsing overhead and false positives
  await page.exposeFunction("__onCspViolation", (violation: CspViolation) => {
    violations.push(violation);
  });

  // Capture document-level CSP violation events via SecurityPolicyViolationEvent
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      const globalViolationHandler = (
        window as unknown as {
          __onCspViolation?: (v: {
            blockedURI: string;
            effectiveDirective: string;
            violatedDirective: string;
          }) => void;
        }
      ).__onCspViolation;

      if (globalViolationHandler) {
        globalViolationHandler({
          blockedURI: e.blockedURI,
          effectiveDirective: e.effectiveDirective,
          violatedDirective: e.violatedDirective,
        });
      }
    });
  });

  const guestRoutes = [
    { path: "/", waitSelector: "#main-content" },
    { path: "/about", waitSelector: "#main-content" },
    { path: "/privacy-policy", waitSelector: "#main-content" },
    {
      path: "/login",
      waitSelector: "input[type='email'], form, #main-content",
    },
    {
      path: "/company/armis",
      waitSelector: "#main-content, [data-testid='not-found']",
    },
  ];

  for (const { path, waitSelector } of guestRoutes) {
    violations.length = 0;
    const response = await page.goto(path);
    expect(response).not.toBeNull();

    // Wait on a concrete UI element instead of flaky networkidle
    await page
      .locator(waitSelector)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });

    expect(
      violations,
      `CSP violations on ${path}: ${violations.map((v) => `${v.effectiveDirective}: ${v.blockedURI}`).join("; ")}`
    ).toHaveLength(0);
  }
});
