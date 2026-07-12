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

function parseServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${result.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return result.data;
}

export const serverEnv = parseServerEnv();
