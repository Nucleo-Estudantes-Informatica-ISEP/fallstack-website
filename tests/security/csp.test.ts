import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  getAllSources,
  getDirective,
  parseCsp,
  setDefaultTrustedEnv,
  TEST_SENTRY_ORIGIN,
  UNTRUSTED_ORIGIN,
} from "./cspTestUtils";

beforeEach(setDefaultTrustedEnv);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("required security directives remain in place", async () => {
  const { buildCsp } = await import("../../src/security/csp.js");
  const directives = parseCsp(buildCsp());
  expect(directives["default-src"]).toEqual(["'self'"]);
  expect(directives["object-src"]).toEqual(["'none'"]);
  expect(directives["frame-ancestors"]).toEqual(["'none'"]);
  expect(directives["base-uri"]).toEqual(["'self'"]);
  expect(directives["form-action"]).toEqual(["'self'"]);
});

test("storage stays same origin and Sentry only needs connect-src", async () => {
  const { buildCsp } = await import("../../src/security/csp.js");
  const csp = buildCsp();
  expect(getDirective(csp, "connect-src")).toEqual([
    "'self'",
    TEST_SENTRY_ORIGIN,
  ]);
  expect(getDirective(csp, "img-src")).toEqual(["'self'", "data:", "blob:"]);
  expect(getDirective(csp, "style-src")).toContain("'unsafe-inline'");
});

test("missing or invalid Sentry DSN adds no origin", async () => {
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "not-a-valid-dsn");
  vi.resetModules();
  const { buildCsp } = await import("../../src/security/csp.js");
  expect(getDirective(buildCsp(), "connect-src")).toEqual(["'self'"]);
});

test("script policy stays self only and no wildcard is introduced", async () => {
  const { buildCsp } = await import("../../src/security/csp.js");
  const csp = buildCsp();
  expect(getDirective(csp, "script-src")).toEqual(["'self'"]);
  expect(getAllSources(csp)).not.toContain(UNTRUSTED_ORIGIN);
  expect(getAllSources(csp)).not.toContain("*");
});
