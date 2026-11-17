import { afterEach, describe, expect, test, vi } from "vitest";

import robots from "./robots";

describe("robots.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("production robots.txt allows public crawling, disallows private routes, and points to sitemap", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("IS_STAGING", "false");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://fallstack.nei-isep.org/api");

    const result = robots();

    expect(result.sitemap).toBe("https://fallstack.nei-isep.org/sitemap.xml");
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toContain("/api/");
    expect(rules.disallow).toContain("/dashboard");
    expect(rules.disallow).toContain("/login");
    expect(rules.disallow).toContain("/students");
    expect(rules.disallow).not.toContain("/event");
    expect(rules.disallow).not.toContain("/about");
  });

  test("staging robots.txt does not block crawling before noindex is processed, and omits sitemap", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("IS_STAGING", "true");

    const result = robots();

    expect(result.sitemap).toBeUndefined();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
  });
});
