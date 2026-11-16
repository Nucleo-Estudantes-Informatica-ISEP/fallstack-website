import { expect, test } from "./fixtures";

const NONCE_PATH = "/login";
const CACHEABLE_DOCUMENTS = [
  "/event/pt",
  "/event/en",
  "/about",
  "/privacy-policy",
  "/terms",
];

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

test("login emits an enforced CSP header with a fresh nonce per document", async ({
  page,
}) => {
  const response = await page.goto(NONCE_PATH);

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
  expect(await response!.text()).toContain(
    `nonce="${csp.match(/'nonce-([^']+)'/)![1]}"`
  );
  const reload = await page.reload();
  expect(reload!.headers()["content-security-policy"]).not.toBe(csp);
});

test("cacheable public documents omit CSP and retain X-Frame-Options", async ({
  request,
}) => {
  for (const path of CACHEABLE_DOCUMENTS) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["content-type"]).toContain("text/html");
    expect(headers["content-security-policy"]).toBeUndefined();
    expect(headers["content-security-policy-report-only"]).toBeUndefined();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["set-cookie"]).toBeUndefined();
    expect(await response.text()).not.toMatch(/\bnonce="[^"]+"/);
  }
});

test("navigating from the public homepage to login loads a protected document", async ({
  page,
}) => {
  await page.goto("/event/pt");
  const document = page.waitForResponse(
    (response) =>
      response.request().isNavigationRequest() &&
      new URL(response.url()).pathname === NONCE_PATH
  );
  await page.getByRole("link", { name: "Iniciar sessão" }).click();
  const response = await document;
  expect(response.headers()["content-security-policy"]).toContain(
    "'strict-dynamic'"
  );
});

test("the homepage URL preserves Accept-Language and explicit language links", async ({
  request,
}) => {
  for (const [path, locale, target] of [
    ["/", "en-GB", "/event/en"],
    ["/", "pt-PT", "/event/pt"],
    ["/?lang=EN", "pt-PT", "/event/en"],
  ]) {
    const response = await request.get(path, {
      headers: { "Accept-Language": locale },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(target);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
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
    { path: "/event/pt", waitSelector: "#main-content" },
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

    // Verify visible content before waiting for this page's lazy requests.
    await page
      .locator(waitSelector)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    // Observe late CSP events and let guarded prefetches finish before navigating.
    await page.waitForLoadState("networkidle");

    expect(
      violations,
      `CSP violations on ${path}: ${violations.map((v) => `${v.effectiveDirective}: ${v.blockedURI}`).join("; ")}`
    ).toHaveLength(0);
  }
});
