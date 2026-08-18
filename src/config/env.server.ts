import "server-only";

import { z } from "zod";

// Secrets and server-only config. Supabase remains the Storage/Postgres
// provider, but authentication is owned directly by ZITADEL/AuthNEI.
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  AUTH_ISSUER_URL: z.string().url(),
  AUTH_PROJECT_ID: z.string().min(1),
  AUTH_GLOBAL_PROJECT_ID: z.string().min(1),
  AUTH_CLIENT_ID: z.string().min(1),
  AUTH_CLIENT_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_SCOPES: z.string().min(1),
  AUTH_ROLE_CLAIM: z.string().min(1),
  AUTH_GLOBAL_ROLE_CLAIM: z.string().min(1),
  AUTH_REDIRECT_URI: z.string().url(),
  AUTH_POST_LOGOUT_REDIRECT_URI: z.string().url(),
  ZITADEL_ORG_ID: z.string().min(1),
  ZITADEL_ROLE_ASSIGNER_TOKEN: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${result.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}

// Validated lazily so Next's build-time route import pass does not require
// production secrets. Real requests read these properties before use.
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return parseServerEnv()[prop];
  },
});
