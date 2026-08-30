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
