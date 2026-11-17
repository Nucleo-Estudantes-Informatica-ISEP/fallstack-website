import { afterEach, describe, expect, test, vi } from "vitest";

import sitemap from "./sitemap";

describe("sitemap.xml", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("production sitemap returns public, canonical URLs on official domain", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("IS_STAGING", "false");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://fallstack.nei-isep.org/api");

    const entries = await sitemap();

    expect(entries.length).toBeGreaterThanOrEqual(5);

    const urls = entries.map((e) => e.url);

    // All entries must belong to the official production domain
    for (const url of urls) {
      expect(url.startsWith("https://fallstack.nei-isep.org/")).toBe(true);
      expect(url).not.toContain("staging");
    }

    // Required public routes
    expect(urls).toContain("https://fallstack.nei-isep.org/event/pt");
    expect(urls).toContain("https://fallstack.nei-isep.org/event/en");
    expect(urls).toContain("https://fallstack.nei-isep.org/about");
    expect(urls).toContain("https://fallstack.nei-isep.org/privacy-policy");
    expect(urls).toContain("https://fallstack.nei-isep.org/terms");

    // Must NOT contain private, auth, admin, or API routes
    for (const url of urls) {
      expect(url).not.toContain("/api");
      expect(url).not.toContain("/dashboard");
      expect(url).not.toContain("/student/");
      expect(url).not.toContain("/login");
      expect(url).not.toContain("/signup");
      expect(url).not.toContain("/attendance");
      expect(url).not.toContain("/overview");
    }

    // Event entries have language alternates
    const ptEntry = entries.find((e) =>
      e.url.endsWith("/event/pt")
    );
    expect(ptEntry?.alternates?.languages).toEqual({
      pt: "https://fallstack.nei-isep.org/event/pt",
      en: "https://fallstack.nei-isep.org/event/en",
      "x-default": "https://fallstack.nei-isep.org/",
    });
  });

  test("staging sitemap returns empty array to prevent staging indexation", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("IS_STAGING", "true");

    const entries = await sitemap();
    expect(entries).toEqual([]);
  });
});
