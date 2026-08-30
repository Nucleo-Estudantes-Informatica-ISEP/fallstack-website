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
const sources = {
  // Supabase API, Auth and Storage.
  supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,

  // Client-side error reporting endpoint.
  sentry: process.env.NEXT_PUBLIC_SENTRY_DSN
    ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).origin
    : undefined,

  // External Inter font stylesheet and font files.
  rsms: "https://rsms.me",

  // YouTube embeds used by company profiles.
  youtube: "https://www.youtube.com",
};

const isProduction = process.env.NODE_ENV === "production";

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

  ...(isProduction ? {} : { "report-uri": ["/api/csp-report"] }),
};
/**
 * Builds the CSP header value from the directive configuration.
 */
export function buildCsp() {
  return Object.entries(directives)
    .filter(([, values]) => values.every(Boolean))
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Choses the CSP header name based on the environment.
 * In development, we use the report-only header to avoid breaking the app
 * while we tune the policy.
 */
export function getCspHeaderName() {
  return isProduction
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}
