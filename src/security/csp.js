/**
 * Content Security Policy
 *
 * Keep this policy restrictive and explicit.
 * Every external origin must have a documented reason for being allowed.
 *
 * When adding a new external service:
 * 1. Identify which CSP directive it actually requires.
 * 2. Add the origin only to that directive.
 * 3. Document why it is required.
 * 4. Validate the affected E2E flows in staging.
 *
 * Do not use `*` as a workaround for CSP violations.
 * Avoid `unsafe-inline` and `unsafe-eval` unless there is a documented reason.
 */

/**
 * External origins used by the application.
 *
 * Keep external origins centralized here so they are easy to audit
 * and maintain as the application evolves.
 */
function getOriginFromDsn(dsn) {
  if (!dsn) return undefined;

  try {
    return new URL(dsn).origin;
  } catch {
    return undefined;
  }
}

const sources = {
  // Supabase API, Auth and Storage.
  supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,

  // Client-side error reporting endpoint.
  sentry: getOriginFromDsn(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // External Inter font stylesheet and font files.
  rsms: "https://rsms.me",

  // YouTube embeds used by company profiles.
  youtube: "https://www.youtube.com",
};

const directives = {
  "default-src": ["'self'"],

  "script-src": ["'self'"],

  "style-src": ["'self'", "'unsafe-inline'", sources.rsms],

  "img-src": ["'self'", "data:", "blob:", sources.supabase],

  "font-src": ["'self'", sources.rsms],

  "connect-src": ["'self'", sources.supabase, sources.sentry],

  "worker-src": ["'self'"],

  "object-src": ["'none'"],

  "base-uri": ["'self'"],

  "form-action": ["'self'"],

  "frame-src": ["'self'", sources.youtube],

  "frame-ancestors": ["'none'"],
};

function filterDirectiveValues(values) {
  return values.filter((value) => Boolean(value));
}

/**
 * Builds the CSP header value from the directive configuration.
 */
export function buildCsp() {
  return Object.entries(directives)
    .map(([directive, values]) => ({
      directive,
      values: filterDirectiveValues(values),
    }))
    .filter(({ values }) => values.length > 0)
    .map(({ directive, values }) => `${directive} ${values.join(" ")}`)
    .join("; ");
}
