import type { Metadata } from "next";

import { branding } from "@/edition/branding";

export const PRODUCTION_DOMAIN = "fallstack.nei-isep.org";
export const STAGING_DOMAIN = "staging.fallstack.nei-isep.org";

export const SITE_URL = `https://${PRODUCTION_DOMAIN}`;
export const STAGING_URL = `https://${STAGING_DOMAIN}`;

export const DEFAULT_OG_IMAGE = {
  url: "/assets/images/landing-2026.png",
  width: 1512,
  height: 982,
  alt: "Fallstack 2026 - 9ª Edição no ISEP",
};

/**
 * Checks whether a hostname belongs to production.
 * Production hostnames are strictly fallstack.nei-isep.org and www.fallstack.nei-isep.org.
 */
export function isProductionHostname(
  hostname: string | null | undefined
): boolean {
  if (!hostname) return false;
  const clean = hostname.split(":")[0].toLowerCase().trim();
  return clean === PRODUCTION_DOMAIN || clean === `www.${PRODUCTION_DOMAIN}`;
}

/**
 * Checks whether a hostname represents a staging environment.
 */
export function isStagingHostname(
  hostname: string | null | undefined
): boolean {
  if (!hostname) return false;
  const clean = hostname.split(":")[0].toLowerCase().trim();
  if (isProductionHostname(clean)) return false;
  return /(^|[.-])(staging|stage|stg)([.-]|$)/i.test(clean);
}

export interface StagingDetectionOptions {
  headers?: Headers | Record<string, string | null | undefined>;
  hostname?: string | null;
  env?: Record<string, string | undefined>;
}

/**
 * Multi-factor staging detection:
 * 1. Hostname/Header check (x-forwarded-host, host)
 * 2. Environment variables check
 *
 * CRITICAL SAFETY: Production domain `fallstack.nei-isep.org` NEVER receives noindex,
 * even if environment variables are incorrectly set.
 */
export function isStagingEnvironment(
  options: StagingDetectionOptions = {}
): boolean {
  const env = options.env ?? process.env;

  let requestHost: string | null = null;

  if (options.headers) {
    if (typeof (options.headers as Headers).get === "function") {
      const h = options.headers as Headers;
      requestHost = h.get("x-forwarded-host") || h.get("host") || null;
    } else {
      const record = options.headers as Record<
        string,
        string | null | undefined
      >;
      requestHost = record["x-forwarded-host"] || record["host"] || null;
    }
  }

  if (!requestHost && options.hostname) {
    requestHost = options.hostname;
  }

  // Absolute guard: production hostname takes precedence over any variable
  if (isProductionHostname(requestHost)) {
    return false;
  }

  // Hostname explicitly points to staging
  if (isStagingHostname(requestHost)) {
    return true;
  }

  // Environment checks
  const explicitStagingEnv =
    env.APP_ENV === "staging" ||
    env.ENVIRONMENT === "staging" ||
    env.DEPLOYMENT_ENVIRONMENT === "staging" ||
    env.IS_STAGING === "true" ||
    env.IS_STAGING === "1";

  if (explicitStagingEnv) {
    return true;
  }

  const baseUrl = env.NEXT_PUBLIC_BASE_URL || env.SERVICE_URL_WEB;
  if (baseUrl) {
    try {
      const parsedUrl = new URL(baseUrl);
      if (isStagingHostname(parsedUrl.hostname)) {
        return true;
      }
    } catch {
      // Ignore invalid URL strings
    }
  }

  return false;
}

/**
 * Builds an absolute canonical URL on the official production domain.
 */
export function getCanonicalUrl(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const cleanPath =
    normalized.length > 1 && normalized.endsWith("/")
      ? normalized.slice(0, -1)
      : normalized;
  return `${SITE_URL}${cleanPath}`;
}

export interface PublicPageMetadataOptions {
  title?: string;
  description?: string;
  path: string;
  language?: "pt" | "en";
  noIndex?: boolean;
  images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
}

/**
 * Creates standardized, compliant metadata for public pages.
 */
export function createPublicPageMetadata({
  title,
  description,
  path,
  language = "pt",
  noIndex = false,
  images,
}: PublicPageMetadataOptions): Metadata {
  const canonical = getCanonicalUrl(path);
  const resolvedTitle =
    title ?? `${branding.metadata.title}`;
  const resolvedDescription =
    description ?? branding.metadata.description;

  const ogImages = images && images.length > 0 ? images : [DEFAULT_OG_IMAGE];

  return {
    metadataBase: new URL(SITE_URL),
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical,
      ...(path.startsWith("/event")
        ? {
            languages: {
              pt: getCanonicalUrl("/event/pt"),
              en: getCanonicalUrl("/event/en"),
              "x-default": getCanonicalUrl("/"),
            },
          }
        : {}),
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: language === "en" ? "en_US" : "pt_PT",
      alternateLocale: language === "en" ? ["pt_PT"] : ["en_US"],
      url: canonical,
      siteName: branding.metadata.applicationName,
      title: resolvedTitle,
      description: resolvedDescription,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: ogImages.map((img) => img.url),
    },
  };
}

/**
 * Structured Data (Schema.org) generation for the Fallstack Event.
 */
export function buildEventJsonLd(language: "pt" | "en" = "pt") {
  const isEn = language === "en";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: isEn
      ? `Fallstack ${branding.year} - 9th Edition`
      : `Fallstack ${branding.year} - 9ª Edição`,
    alternateName: `Fallstack ${branding.year}`,
    description: isEn
      ? `Fallstack ${branding.year} returns for its 9th edition at ISEP on November 17-18. Technology event connecting students and companies, organized by NEI-ISEP.`
      : branding.metadata.description,
    startDate: branding.event.startsAt,
    endDate: branding.event.endsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: branding.event.venueFull,
      address: {
        "@type": "PostalAddress",
        streetAddress: branding.event.address.street,
        addressLocality: branding.event.address.city,
        postalCode: branding.event.address.postalCode,
        addressCountry: branding.event.address.country,
      },
    },
    image: [`${SITE_URL}${DEFAULT_OG_IMAGE.url}`],
    organizer: {
      "@type": "Organization",
      name: "Núcleo de Estudantes de Informática do ISEP (NEI-ISEP)",
      url: "https://www.nei-isep.org",
      logo: `${SITE_URL}/assets/images/logo-black.png`,
    },
    offers: {
      "@type": "Offer",
      url: getCanonicalUrl(`/event/${language}`),
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01T00:00:00+00:00",
    },
    url: getCanonicalUrl(`/event/${language}`),
  };
}

/**
 * Structured Data (Schema.org) for Website and Organizer.
 */
export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `Fallstack ${branding.year}`,
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: "NEI-ISEP",
      url: "https://www.nei-isep.org",
      logo: `${SITE_URL}/assets/images/logo-black.png`,
    },
    inLanguage: ["pt-PT", "en-US"],
  };
}
