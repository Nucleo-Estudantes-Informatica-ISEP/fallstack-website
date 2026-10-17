import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCsp } from "./csp";

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

describe("Content Security Policy (CSP)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a valid, non-empty CSP policy string", () => {
    const csp = buildCsp();
    expect(csp).toBeTruthy();
    expect(typeof csp).toBe("string");
  });

  it("enforces default-src 'self' strictly", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("default-src")).toEqual(["'self'"]);
  });

  it("restricts script-src to 'self' without unsafe-inline or unsafe-eval in production", () => {
    const directives = parseDirectives(buildCsp({ isDev: false }));
    expect(directives.get("script-src")).toEqual(["'self'"]);
  });

  it("adds nonce and strict-dynamic to script-src when nonce is provided", () => {
    const testNonce = "test-nonce-12345";
    const directives = parseDirectives(
      buildCsp({ nonce: testNonce, isDev: false })
    );
    expect(directives.get("script-src")).toEqual([
      "'self'",
      `'nonce-${testNonce}'`,
      "'strict-dynamic'",
    ]);
  });

  it("adds 'unsafe-eval' to script-src only in development mode for React Refresh", () => {
    const devDirectives = parseDirectives(buildCsp({ isDev: true }));
    expect(devDirectives.get("script-src")).toContain("'unsafe-eval'");

    const prodDirectives = parseDirectives(buildCsp({ isDev: false }));
    expect(prodDirectives.get("script-src")).not.toContain("'unsafe-eval'");
  });

  it("enforces object-src 'none' to block plugin/object embedding", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("object-src")).toEqual(["'none'"]);
  });

  it("enforces frame-ancestors 'none' to prevent clickjacking/framing", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("enforces base-uri 'self' and form-action 'self'", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("form-action")).toEqual(["'self'"]);
  });

  it("supports PWA service worker with worker-src 'self'", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("worker-src")).toEqual(["'self'"]);
  });

  it("restricts image sources exactly to trusted patterns ('self', data:, blob:)", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
  });

  it("does not contain SVG-specific relaxations in img-src or default-src (#282 / #346)", () => {
    const directives = parseDirectives(buildCsp());
    const imgSrcValues = directives.get("img-src") ?? [];
    const defaultSrcValues = directives.get("default-src") ?? [];

    expect(imgSrcValues.some((v) => v.toLowerCase().includes("svg"))).toBe(
      false
    );
    expect(defaultSrcValues.some((v) => v.toLowerCase().includes("svg"))).toBe(
      false
    );
  });

  it("isolates YouTube strictly to frame-src without self", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("frame-src")).toEqual(["https://www.youtube.com"]);

    const scriptSrc = directives.get("script-src") ?? [];
    const connectSrc = directives.get("connect-src") ?? [];
    expect(scriptSrc.some((v) => v.includes("youtube"))).toBe(false);
    expect(connectSrc.some((v) => v.includes("youtube"))).toBe(false);
  });

  it("isolates RSMS Inter font strictly to style-src and font-src", () => {
    const directives = parseDirectives(buildCsp());
    expect(directives.get("style-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://rsms.me",
    ]);
    expect(directives.get("font-src")).toEqual(["'self'", "https://rsms.me"]);

    const scriptSrc = directives.get("script-src") ?? [];
    expect(scriptSrc.some((v) => v.includes("rsms"))).toBe(false);
  });

  it("confines 'unsafe-inline' strictly to style-src and never to script-src", () => {
    const directives = parseDirectives(buildCsp({ isDev: false }));
    expect(directives.get("style-src")).toContain("'unsafe-inline'");
    expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
  });

  it("configures connect-src with Sentry origin when NEXT_PUBLIC_SENTRY_DSN is set", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SENTRY_DSN",
      "https://public@sentry.example.com/42"
    );
    const directives = parseDirectives(buildCsp());
    expect(directives.get("connect-src")).toContain(
      "https://sentry.example.com"
    );
  });

  it("configures connect-src with Supabase origin when NEXT_PUBLIC_SUPABASE_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    const directives = parseDirectives(buildCsp());
    expect(directives.get("connect-src")).toContain("https://demo.supabase.co");
  });

  it("restricts connect-src to 'self' only when both NEXT_PUBLIC_SENTRY_DSN and NEXT_PUBLIC_SUPABASE_URL are unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const directives = parseDirectives(buildCsp());
    expect(directives.get("connect-src")).toEqual(["'self'"]);
  });
});
