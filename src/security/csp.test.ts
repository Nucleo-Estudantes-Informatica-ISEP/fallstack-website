import { describe, expect, it } from "vitest";

import { buildCsp } from "./csp";

describe("Content Security Policy (CSP)", () => {
  it("builds a valid, non-empty CSP policy string", () => {
    const csp = buildCsp();
    expect(csp).toBeTruthy();
    expect(typeof csp).toBe("string");
  });

  it("enforces default-src 'self'", () => {
    const csp = buildCsp();
    expect(csp).toContain("default-src 'self'");
  });

  it("restricts script-src to 'self' without unsafe-inline or unsafe-eval", () => {
    const csp = buildCsp();
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("enforces object-src 'none' to block plugin/object embedding", () => {
    const csp = buildCsp();
    expect(csp).toContain("object-src 'none'");
  });

  it("enforces frame-ancestors 'none' to prevent clickjacking/framing", () => {
    const csp = buildCsp();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("enforces base-uri 'self' and form-action 'self'", () => {
    const csp = buildCsp();
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("supports PWA service worker with worker-src 'self'", () => {
    const csp = buildCsp();
    expect(csp).toContain("worker-src 'self'");
  });

  it("restricts image sources to trusted patterns ('self', data:, blob:)", () => {
    const csp = buildCsp();
    expect(csp).toContain("img-src 'self' data: blob:");
  });

  it("does not contain pre-emptive SVG exceptions or SVG-specific relaxations (#282 / #346)", () => {
    const csp = buildCsp();
    expect(csp).not.toMatch(/svg/i);
  });

  it("isolates external origins strictly to the directives that need them", () => {
    const csp = buildCsp();

    // YouTube must only appear in frame-src
    expect(csp).toContain("frame-src 'self' https://www.youtube.com");
    expect(csp).not.toMatch(/script-src[^;]*youtube/);
    expect(csp).not.toMatch(/connect-src[^;]*youtube/);

    // RSMS Inter font must only appear in style-src and font-src
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://rsms.me");
    expect(csp).toContain("font-src 'self' https://rsms.me");
    expect(csp).not.toMatch(/script-src[^;]*rsms/);
  });

  it("confines 'unsafe-inline' to style-src only and never to script-src", () => {
    const csp = buildCsp();
    // 'unsafe-inline' is accepted in style-src for Next.js CSS-in-JS and
    // Framer Motion, but must never reach script-src.
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("does not contain 'unsafe-eval' in any directive", () => {
    const csp = buildCsp();
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
