import { describe, expect, test } from "vitest";

import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";
import {
  DEFAULT_OG_IMAGE,
  PRODUCTION_DOMAIN,
  SITE_URL,
  STAGING_DOMAIN,
  buildEventJsonLd,
  buildWebsiteJsonLd,
  createPublicPageMetadata,
  getCanonicalUrl,
  isProductionHostname,
  isStagingEnvironment,
  isStagingHostname,
} from "./seo";

describe("SEO - Domain and Staging Detection", () => {
  test("identifies production hostname correctly", () => {
    expect(isProductionHostname(PRODUCTION_DOMAIN)).toBe(true);
    expect(isProductionHostname(`www.${PRODUCTION_DOMAIN}`)).toBe(true);
    expect(isProductionHostname(`${PRODUCTION_DOMAIN}:443`)).toBe(true);
    expect(isProductionHostname("staging.fallstack.nei-isep.org")).toBe(false);
    expect(isProductionHostname("localhost")).toBe(false);
  });

  test("identifies staging hostname correctly", () => {
    expect(isStagingHostname(STAGING_DOMAIN)).toBe(true);
    expect(isStagingHostname("stage.fallstack.nei-isep.org")).toBe(true);
    expect(isStagingHostname("stg.fallstack.nei-isep.org")).toBe(true);
    expect(isStagingHostname("fallstack-staging.example.org")).toBe(true);
    expect(isStagingHostname(PRODUCTION_DOMAIN)).toBe(false);
    expect(isStagingHostname("localhost")).toBe(false);
  });

  test("production allows indexing and never returns staging", () => {
    const isStaging = isStagingEnvironment({
      hostname: PRODUCTION_DOMAIN,
    });
    expect(isStaging).toBe(false);
  });

  test("staging hostname returns staging true", () => {
    const isStaging = isStagingEnvironment({
      hostname: STAGING_DOMAIN,
    });
    expect(isStaging).toBe(true);
  });

  test("staging via x-forwarded-host header", () => {
    const headers = new Headers();
    headers.set("x-forwarded-host", STAGING_DOMAIN);
    expect(isStagingEnvironment({ headers })).toBe(true);
  });

  test("production guard: production hostname NEVER marked as staging even if env is staging", () => {
    const headers = new Headers();
    headers.set("host", PRODUCTION_DOMAIN);
    const env = {
      APP_ENV: "staging",
      IS_STAGING: "true",
      NEXT_PUBLIC_BASE_URL: "https://staging.fallstack.nei-isep.org/api",
    };
    expect(isStagingEnvironment({ headers, env })).toBe(false);
  });

  test("staging via environment variable when hostname is generic or unset", () => {
    expect(isStagingEnvironment({ env: { APP_ENV: "staging" } })).toBe(true);
    expect(isStagingEnvironment({ env: { IS_STAGING: "true" } })).toBe(true);
    expect(
      isStagingEnvironment({
        env: {
          NEXT_PUBLIC_BASE_URL: "https://staging.fallstack.nei-isep.org/api",
        },
      })
    ).toBe(true);
  });
});

describe("SEO - Canonical URLs", () => {
  test("generates absolute canonical URL on official production domain", () => {
    expect(getCanonicalUrl("/event/pt")).toBe(
      "https://fallstack.nei-isep.org/event/pt"
    );
    expect(getCanonicalUrl("event/en")).toBe(
      "https://fallstack.nei-isep.org/event/en"
    );
    expect(getCanonicalUrl("/about/")).toBe(
      "https://fallstack.nei-isep.org/about"
    );
    expect(getCanonicalUrl("/")).toBe("https://fallstack.nei-isep.org/");
  });
});

describe("SEO - Public Page Metadata", () => {
  test("metadata contains correct canonical, robots, OG, and Twitter configuration", () => {
    const meta = createPublicPageMetadata({
      title: "Teste Página",
      description: "Descrição de teste",
      path: "/about",
      language: "pt",
    });

    expect(meta.metadataBase?.toString()).toBe("https://fallstack.nei-isep.org/");
    expect(meta.title).toBe("Teste Página");
    expect(meta.description).toBe("Descrição de teste");
    expect(meta.alternates?.canonical).toBe(
      "https://fallstack.nei-isep.org/about"
    );
    expect(meta.robots).toEqual({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    });
    expect(meta.openGraph?.url).toBe("https://fallstack.nei-isep.org/about");
    expect(meta.openGraph?.locale).toBe("pt_PT");
    expect(meta.openGraph?.alternateLocale).toEqual(["en_US"]);
    expect(meta.twitter?.card).toBe("summary_large_image");
    expect(meta.openGraph?.images).toEqual([DEFAULT_OG_IMAGE]);
  });

  test("event page metadata includes reciprocal hreflang and x-default", () => {
    const ptMeta = createPublicPageMetadata({
      path: "/event/pt",
      language: "pt",
    });
    expect(ptMeta.alternates?.languages).toEqual({
      pt: "https://fallstack.nei-isep.org/event/pt",
      en: "https://fallstack.nei-isep.org/event/en",
      "x-default": "https://fallstack.nei-isep.org/",
    });

    const enMeta = createPublicPageMetadata({
      path: "/event/en",
      language: "en",
    });
    expect(enMeta.alternates?.languages).toEqual({
      pt: "https://fallstack.nei-isep.org/event/pt",
      en: "https://fallstack.nei-isep.org/event/en",
      "x-default": "https://fallstack.nei-isep.org/",
    });
    expect(enMeta.openGraph?.locale).toBe("en_US");
  });

  test("metadata does not contain staging URLs", () => {
    const meta = createPublicPageMetadata({
      path: "/privacy-policy",
    });
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toContain("staging.fallstack.nei-isep.org");
    expect(serialized).not.toContain("staging");
  });
});

describe("SEO - Structured Data (JSON-LD)", () => {
  test("generates valid Schema.org Event with verified edition data", () => {
    const jsonLd = buildEventJsonLd("pt");
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Event");
    expect(jsonLd.name).toContain("9ª Edição");
    expect(jsonLd.startDate).toBe(branding.event.startsAt);
    expect(jsonLd.endDate).toBe(branding.event.endsAt);
    expect(jsonLd.location.name).toBe("Instituto Superior de Engenharia do Porto (ISEP)");
    expect(jsonLd.location.address.addressCountry).toBe("PT");
    expect(jsonLd.organizer.name).toContain("NEI-ISEP");
    expect(jsonLd.organizer.url).toBe("https://www.nei-isep.org");
    expect(jsonLd.offers.price).toBe("0");
    expect(jsonLd.url).toBe("https://fallstack.nei-isep.org/event/pt");
  });

  test("generates valid Schema.org Event in English", () => {
    const jsonLd = buildEventJsonLd("en");
    expect(jsonLd.name).toContain("9th Edition");
    expect(jsonLd.url).toBe("https://fallstack.nei-isep.org/event/en");
  });

  test("generates valid Schema.org WebSite with publisher", () => {
    const jsonLd = buildWebsiteJsonLd();
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("WebSite");
    expect(jsonLd.publisher["@type"]).toBe("Organization");
    expect(jsonLd.url).toBe(SITE_URL);
  });
});
