import "server-only";

import { z } from "zod";

// Secrets and server-only config. Reads the full `process.env` (the real
// runtime environment on the server, unlike the client bundle) so this
// module never needs to enumerate the passthrough NODE_ENV/LOG_LEVEL vars
// by hand. Importing this from client code is a build-time error.
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

// Validated lazily, on first property access, rather than at import time.
// `next build`'s page-data collection imports every route module (and so
// transitively this one) without ever reading a property off `serverEnv` —
// the production Dockerfile's builder stage only has the Sentry build args,
// not these secrets, so eager validation here broke `next build`. Real
// requests always read a property before the response is sent, so this
// still validates before the value is ever used.
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return parseServerEnv()[prop];
  },
});
