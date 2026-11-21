import { expect, test } from "vitest";

import { publicDataRuntimeCaching } from "./publicDataRuntimeCaching";

test.each([
  ["/api/auth/session", "cors", false],
  ["/api/companies/history/cv-zip", "cors", false],
  ["/api/faqs?lang=EN", "cors", false],
  ["/student/EXAMPLE", "navigate", false],
  ["/dashboard?_rsc=fixture", "cors", true],
  ["/event/en", "navigate", false],
])("loads %s from the network", (path, mode, rsc) => {
  const [rule] = publicDataRuntimeCaching;
  const request = { mode, headers: new Headers(rsc ? { RSC: "1" } : {}) };
  expect(rule.handler).toBe("NetworkOnly");
  expect(
    rule.urlPattern({
      url: new URL(path, "https://example.com"),
      request,
      sameOrigin: true,
    })
  ).toBe(true);
  expect(
    rule.urlPattern({
      url: new URL(path, "https://elsewhere.com"),
      request,
      sameOrigin: false,
    })
  ).toBe(false);
});

test("production PWA precaches a script-free document fallback without caching homepage data", async () => {
  const { readFile } = await import("node:fs/promises");
  const config = await readFile("next.config.js", "utf8");
  expect(config).toContain("extendDefaultRuntimeCaching: false");
  expect(config).toContain('fallbacks: { document: "/offline.html" }');
  const offline = await readFile("public/offline.html", "utf8");
  expect(offline).toContain('href="/"');
  expect(offline).toContain('href="/offline.css"');
  expect(offline).toContain("You are offline");
  expect(offline).not.toContain('href=""');
  expect(offline).not.toMatch(/<script|<iframe|\bon\w+=/i);
});

test("offline fallback stylesheet is precached and has no extra cached dependencies", async () => {
  const { readFile } = await import("node:fs/promises");
  const config = await readFile("next.config.js", "utf8");
  expect(config).not.toContain("publicExcludes");
  const css = await readFile("public/offline.css", "utf8");
  expect(css).not.toMatch(/@font-face|@import|url\(/);
});
