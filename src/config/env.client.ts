import { z } from "zod";

// Vars read here as `process.env.NEXT_PUBLIC_*` (literal member access) so
// Next.js can statically inline them into the browser bundle. Safe to import
// from both Client and Server Components.
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Explicit empty values still mean "unset" so direct builds can fall back
  // to the same local port used by the Docker runner and .env.example.
  NEXT_PUBLIC_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().default("http://localhost:4000/api")
  ),
  // Empty string (the Dockerfile's `ARG NEXT_PUBLIC_SENTRY_DSN=""` default
  // when no build arg is supplied) means "unset", same as undefined — not
  // an invalid URL.
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
  // Links the admin backoffice's Logs nav item out to wherever GlitchTip/
  // Sentry is hosted - no in-app log persistence, just a pointer. Absent
  // means "unset", same as NEXT_PUBLIC_SENTRY_DSN above.
  NEXT_PUBLIC_LOGS_DASHBOARD_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
});

function parseClientEnv() {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_LOGS_DASHBOARD_URL: process.env.NEXT_PUBLIC_LOGS_DASHBOARD_URL,
  });

  if (!result.success) {
    throw new Error(
      `Invalid client environment variables:\n${result.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return result.data;
}

// These are all `NEXT_PUBLIC_*` vars: Next.js inlines them into the browser
// bundle at build time, so unlike `serverEnv` they must stay eagerly
// validated here — the Docker builder stage needs to actually receive them
// as build args (see Dockerfile/docker-compose.app.yml), not have this
// deferred to request time.
export const clientEnv = parseClientEnv();
