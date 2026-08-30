import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  getAllSources,
  getDirective,
  parseCsp,
  setDefaultTrustedEnv,
  TEST_BLOCKED_URI,
  TEST_DOCUMENT_URI,
  TEST_REPORT_ENDPOINT,
  TEST_SENTRY_DSN,
  TEST_SENTRY_ORIGIN,
  TEST_SUPABASE_URL,
  UNTRUSTED_ORIGIN,
} from "./cspTestUtils";

beforeEach(() => {
  setDefaultTrustedEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("CSP generation", () => {
  test("required security directives remain in place", async () => {
    const { buildCsp } = await import("../../src/security/csp.js");
    const directives = parseCsp(buildCsp());

    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
  });

  test("environment-derived origins are included only in the directives that need them", async () => {
    const { buildCsp } = await import("../../src/security/csp.js");
    const csp = buildCsp();
    const directives = parseCsp(csp);

    expect(directives["connect-src"]).toEqual(
      expect.arrayContaining(["'self'", TEST_SUPABASE_URL, TEST_SENTRY_ORIGIN])
    );
    expect(directives["img-src"]).toEqual(
      expect.arrayContaining(["'self'", "data:", "blob:", TEST_SUPABASE_URL])
    );
    expect(getDirective(csp, "style-src")).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'"])
    );
    expect(getDirective(csp, "font-src")).toEqual(
      expect.arrayContaining(["'self'"])
    );
  });

  test("empty env-derived origins are ignored instead of weakening the policy", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");

    const { buildCsp } = await import("../../src/security/csp.js");
    const csp = buildCsp();

    expect(getDirective(csp, "connect-src")).not.toContain("");
    expect(getDirective(csp, "img-src")).not.toContain("");
    expect(getDirective(csp, "font-src")).toEqual(
      expect.arrayContaining(["'self'"])
    );
  });
});

describe("development vs production behavior", () => {
  test("development uses report-only mode and production enforces the policy", async () => {
    // Arrange
    // Development should surface violations without breaking the app; production must enforce the real policy.

    // Act
    const devModule = await import("../../src/security/csp.js");
    const devHeader = devModule.getCspHeaderName();
    const devCsp = devModule.buildCsp();

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", TEST_SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", TEST_SENTRY_DSN);

    const prodModule = await import("../../src/security/csp.js");
    const prodHeader = prodModule.getCspHeaderName();
    const prodCsp = prodModule.buildCsp();

    // Assert
    // The browser must be able to collect violations in development without allowing the app to ship with a weakened policy.
    expect(devHeader).toBe("Content-Security-Policy-Report-Only");
    expect(devCsp).toContain(`report-uri ${TEST_REPORT_ENDPOINT}`);
    expect(prodHeader).toBe("Content-Security-Policy");
    expect(prodCsp).not.toContain("report-uri");
  });
});

describe("CSP security invariants", () => {
  test("script-src is self-only and dangerous wildcard or execution patterns are absent", async () => {
    const { buildCsp } = await import("../../src/security/csp.js");
    const csp = buildCsp();
    const scriptSources = getDirective(csp, "script-src");
    const allSources = getAllSources(csp);

    expect(scriptSources).toEqual(["'self'"]);
    expect(scriptSources).not.toContain(UNTRUSTED_ORIGIN);

    expect(allSources).not.toContain("*");
    expect(allSources).not.toContain("https://*");
    expect(allSources).not.toContain("http://*");
    expect(allSources).not.toContain("wss://*");
    expect(allSources).not.toContain("ws://*");
    expect(allSources).not.toContain("javascript:");
    expect(allSources).not.toContain("'unsafe-eval'");
  });
});

describe("CSP report endpoint", () => {
  test("accepts a valid CSP violation report and logs it", async () => {
    // Arrange
    // The report endpoint must accept the browser's CSP report payload when running in development.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const payload = {
      "csp-report": {
        "document-uri": TEST_DOCUMENT_URI,
        "violated-directive": "script-src 'self'",
        "blocked-uri": TEST_BLOCKED_URI,
      },
    };

    // Act
    const { POST } = await import("../../src/app/api/csp-report/route");
    const request = new NextRequest(`http://localhost${TEST_REPORT_ENDPOINT}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(request);

    // Assert
    // Valid browser reports should be accepted and routed to the logging sink without breaking the app.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toBe("CSP violation report:");
    expect(warnSpy.mock.calls[0]?.[1]).toContain(
      `"document-uri": "${TEST_DOCUMENT_URI}"`
    );
  });

  test("rejects malformed payloads without logging them", async () => {
    // Arrange
    // Public endpoints should ignore unexpected data and avoid logging malformed reports.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const { POST } = await import("../../src/app/api/csp-report/route");
    const request = new NextRequest(`http://localhost${TEST_REPORT_ENDPOINT}`, {
      method: "POST",
      body: JSON.stringify({ unexpected: true }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(request);
    const body = await response.json();

    // Assert
    // Invalid report shapes should fail closed and not be logged.
    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid CSP report payload" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON without logging it", async () => {
    // Arrange
    // The endpoint must fail safely when the browser sends invalid JSON.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const { POST } = await import("../../src/app/api/csp-report/route");
    const request = new NextRequest(`http://localhost${TEST_REPORT_ENDPOINT}`, {
      method: "POST",
      body: "{bad json",
      headers: { "content-type": "application/json" },
    });
    const response = await POST(request);
    const body = await response.json();

    // Assert
    // Invalid JSON is untrusted input and must not be accepted or logged.
    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON body" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("blocks the report endpoint in production", async () => {
    // Arrange
    // Production must not expose the debugging report endpoint.
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");

    // Act
    const { POST } = await import("../../src/app/api/csp-report/route");
    const request = new NextRequest(`http://localhost${TEST_REPORT_ENDPOINT}`, {
      method: "POST",
      body: JSON.stringify({
        "csp-report": { "document-uri": TEST_DOCUMENT_URI },
      }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(request);
    const body = await response.json();

    // Assert
    // The production build must not accept or log browser violation reports.
    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Not available in production" });
  });

  test("development GET exposes the diagnostic metadata", async () => {
    // Arrange
    // The diagnostic route is intentionally available only to tune the local CSP safely.

    // Act
    const { GET } = await import("../../src/app/api/csp-report/route");
    const response = await GET();
    const body = await response.json();

    // Assert
    // The endpoint should report its runtime environment without leaking anything beyond the expected diagnostics.
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      environment: "development",
    });
    expect(body).toHaveProperty("note");
  });
});
