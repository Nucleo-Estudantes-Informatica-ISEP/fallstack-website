import { z } from "zod";

// Vars read here as `process.env.NEXT_PUBLIC_*` (literal member access) so
// Next.js can statically inline them into the browser bundle. Safe to import
// from both Client and Server Components.
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Environment-related fix, not strictly in scope of the Docker non-root
  // change this shipped alongside (#218/#207): the Dockerfile's
  // `ARG NEXT_PUBLIC_BASE_URL=""` default means "unset" the same way
  // `NEXT_PUBLIC_SENTRY_DSN` below does, but without this preprocess step
  // the empty string reached `.url()` directly and failed validation
  // instead of falling through to `.default()` — so a build run without
  // this build arg supplied (e.g. `docker build` with no `--build-arg`s)
  // failed at `next build` time instead of using the documented default.
  NEXT_PUBLIC_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().default("http://localhost:3000/api")
  ),
  // Empty string (the Dockerfile's `ARG NEXT_PUBLIC_SENTRY_DSN=""` default
  // when no build arg is supplied) means "unset", same as undefined — not
  // an invalid URL.
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
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
