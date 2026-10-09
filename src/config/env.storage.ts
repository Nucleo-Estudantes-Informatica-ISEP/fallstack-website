import "server-only";

import { z } from "zod";

// Narrow Zod env boundary: serverEnv reuses this schema; the worker cannot load
// serverEnv because it validates unrelated OIDC/JWT credentials. Raw reads stay here.
export const storageEnvSchema = z.object({
  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_AVATARS: z.string().min(1),
  S3_BUCKET_LOGOS: z.string().min(1),
  S3_BUCKET_CVS: z.string().min(1),
});

let cached: z.infer<typeof storageEnvSchema> | undefined;
export const storageEnv = new Proxy({} as z.infer<typeof storageEnvSchema>, {
  get(_target, prop: keyof z.infer<typeof storageEnvSchema>) {
    cached ??= storageEnvSchema.parse(process.env);
    return cached[prop];
  },
});

export function cleanupMode() {
  return z
    .enum(["dry-run", "apply"])
    .default("dry-run")
    .parse(process.env.STORAGE_CLEANUP_MODE);
}
