import { expect, test } from "vitest";

import { publicDataRuntimeCaching } from "./publicDataRuntimeCaching";

test("homepage HTML/RSC and public JSON bypass Workbox cache for both languages, preserving other rules", () => {
  const [rule] = publicDataRuntimeCaching;
  expect(rule.handler).toBe("NetworkOnly");
  for (const path of ["faqs", "schedule", "sponsors", "companies/roster"]) {
    expect(
      rule.urlPattern({
        url: new URL(`https://example.com/api/${path}?lang=EN`),
        sameOrigin: true,
      })
    ).toBe(true);
    expect(
      rule.urlPattern({
        url: new URL(`https://elsewhere.com/api/${path}`),
        sameOrigin: false,
      })
    ).toBe(false);
  }
  for (const path of [
    "/api/companies",
    "/api/auth/session",
    "/api/faqs/private",
    "/assets/image.webp",
  ]) {
    expect(
      rule.urlPattern({
        url: new URL(path, "https://example.com"),
        sameOrigin: true,
      })
    ).toBe(false);
  }
});

test("homepage navigation, language variants and RSC bypass old document caches", () => {
  const [rule] = publicDataRuntimeCaching;
  for (const query of [
    "",
    "?lang=PT",
    "?lang=EN",
    "?_rsc=abc",
    "?lang=EN&_rsc=abc",
  ]) {
    expect(
      rule.urlPattern({
        url: new URL(`https://example.com/${query}`),
        sameOrigin: true,
      })
    ).toBe(true);
    expect(
      rule.urlPattern({
        url: new URL(`https://elsewhere.com/${query}`),
        sameOrigin: false,
      })
    ).toBe(false);
  }
});

test("production PWA precaches a script-free document fallback without caching homepage data", async () => {
  const { readFile } = await import("node:fs/promises");
  const config = await readFile("next.config.js", "utf8");
  expect(config).toContain('fallbacks: { document: "/offline.html" }');
  const offline = await readFile("public/offline.html", "utf8");
  expect(offline).toContain('href="/"');
  expect(offline).toContain("You are offline");
  expect(offline).not.toMatch(/<script|<iframe|\bon\w+=/i);
});
