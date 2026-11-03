import "server-only";

import { z } from "zod";

// Runtime pools share a 100-slot cluster with other NEI applications; ADR 0026.
export const databaseEnvSchema = z.object({
  PRISMA_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(3).default(3),
  PRISMA_POOL_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),
});

export function runtimeDatabaseUrl(
  env: Record<string, string | undefined> = process.env
) {
  const settings = databaseEnvSchema.parse(env);
  // Next imports routes while building without runtime database credentials.
  if (!env.DATABASE_URL) return undefined;
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("Invalid PostgreSQL runtime URL");
  }
  // These settings are authoritative, including when the URL has old pool params.
  url.searchParams.set(
    "connection_limit",
    String(settings.PRISMA_CONNECTION_LIMIT)
  );
  url.searchParams.set(
    "pool_timeout",
    String(settings.PRISMA_POOL_TIMEOUT_SECONDS)
  );
  return url.toString();
}
