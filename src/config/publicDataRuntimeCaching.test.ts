import { expect, test } from "vitest";

import { publicDataRuntimeCaching } from "./publicDataRuntimeCaching";

test("public JSON bypasses Workbox cache for both languages, preserving other rules", () => {
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
    "/",
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
