import type { MetadataRoute } from "next";

import { SITE_URL, isStagingEnvironment } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const isStaging = isStagingEnvironment();

  if (isStaging) {
    // In staging, allow engines to crawl so they discover X-Robots-Tag: noindex,
    // but do not link to any production or staging sitemap.
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/overview",
        "/actions",
        "/admins",
        "/attendance",
        "/companies",
        "/employees",
        "/faqs",
        "/giveaway",
        "/interests",
        "/scans",
        "/schedule",
        "/sponsors",
        "/statistics",
        "/storage",
        "/students",
        "/dashboard",
        "/student",
        "/login",
        "/password-reset",
        "/signup",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
