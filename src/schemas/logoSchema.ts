import { z } from "zod";

import { serverEnv } from "@/config/env.server";

// Mirrors next.config.js's `images.remotePatterns` - next/image throws a
// render-time "hostname is not configured" error for any host not listed
// there, so an admin-submitted logo URL from an arbitrary host would save
// fine and only break the public page when rendered. Keep this in sync with
// next.config.js if that allowlist changes.
//
// Computed inside the function, not at module scope: `serverEnv` validates
// lazily on first property access (see env.server.ts) so that `next build`'s
// page-data collection - which imports every route module, including this
// one transitively, without ever using it - doesn't fail on missing secrets.
// Reading `serverEnv.NODE_ENV` at import time here would force that
// validation eagerly and reintroduce the same build failure.
function allowedLogoHostnames(): RegExp[] {
  return [
    /(^|\.)supabase\.co$/,
    /(^|\.)storage\.googleapis\.com$/,
    /^firebasestorage\.googleapis\.com$/,
    ...(serverEnv.NODE_ENV !== "production" ? [/^127\.0\.0\.1$/] : []),
  ];
}

function isAllowedLogoUrl(value: string): boolean {
  const parsed = z.url().safeParse(value);
  if (!parsed.success) return false;

  const { hostname } = new URL(value);
  return allowedLogoHostnames().some((pattern) => pattern.test(hostname));
}

// Logos may be an absolute URL into configured Storage (a freshly-uploaded
// object) or an absolute path into public/ (the pre-existing static assets -
// see the add_sponsor_table/company_display_fields migrations' backfills,
// which reference them by path rather than re-uploading them).
export const logoSchema = z
  .string()
  .max(2048)
  .refine((value) => value.startsWith("/") || isAllowedLogoUrl(value), {
    message:
      'Must be an absolute path starting with "/" or a URL from configured storage',
  });
