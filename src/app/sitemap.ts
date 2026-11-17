import type { MetadataRoute } from "next";

import { SITE_URL, isStagingEnvironment } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Never expose or index sitemaps in staging
  if (isStagingEnvironment()) {
    return [];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/event/pt`,
      lastModified: new Date("2026-11-17T08:30:00Z"),
      alternates: {
        languages: {
          pt: `${SITE_URL}/event/pt`,
          en: `${SITE_URL}/event/en`,
          "x-default": `${SITE_URL}/`,
        },
      },
    },
    {
      url: `${SITE_URL}/event/en`,
      lastModified: new Date("2026-11-17T08:30:00Z"),
      alternates: {
        languages: {
          pt: `${SITE_URL}/event/pt`,
          en: `${SITE_URL}/event/en`,
          "x-default": `${SITE_URL}/`,
        },
      },
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date("2026-11-17T08:30:00Z"),
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date("2026-10-31T00:00:00Z"),
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date("2026-10-31T00:00:00Z"),
    },
  ];

  try {
    const { getActiveCompanies } = await import(
      "@/application/services/companyService"
    );
    const companies = await getActiveCompanies();
    const companyRoutes: MetadataRoute.Sitemap = companies
      .filter((company) => company.rank.style?.hasInternalPage && company.profile)
      .map((company) => ({
        url: `${SITE_URL}/company/${encodeURIComponent(company.name)}`,
      }));

    return [...staticRoutes, ...companyRoutes];
  } catch {
    // During offline builds or when DB is not reachable, return confirmed static routes
    return staticRoutes;
  }
}
