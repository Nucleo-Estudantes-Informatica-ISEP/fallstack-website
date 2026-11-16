import { z } from "zod";

// Shared by server repositories and standalone Node jobs; never import into UI.
// Runtime pools share a cluster with other applications; ADR 0028.
function poolSetting(fallback: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && (value.trim() === "" || Number(value) < 1)
        ? undefined
        : value,
    z.coerce.number().int().min(1).max(10).default(fallback)
  );
}

export const databaseEnvSchema = z.object({
  PRISMA_CONNECTION_LIMIT: poolSetting(3),
  PRISMA_POOL_TIMEOUT_SECONDS: poolSetting(5),
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

// Probes and standalone jobs must not inherit the web pool's capacity or wait.
export function singleConnectionDatabaseUrl(
  env: Record<string, string | undefined> = process.env
) {
  return runtimeDatabaseUrl({
    ...env,
    PRISMA_CONNECTION_LIMIT: "1",
    PRISMA_POOL_TIMEOUT_SECONDS: "5",
  });
}
