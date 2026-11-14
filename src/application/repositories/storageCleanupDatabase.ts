import "server-only";

import { PrismaClient } from "@prisma/client";

import { singleConnectionDatabaseUrl } from "@/config/env.database";

const globalForCleanup = globalThis as unknown as {
  storageCleanupPrisma: PrismaClient | undefined;
};

// Cleanup runs as a standalone job outside the web pool budget. Pin it to one
// connection in code so a missing or stale PRISMA_CONNECTION_LIMIT cannot widen it.
const storageCleanupPrisma =
  globalForCleanup.storageCleanupPrisma ??
  new PrismaClient({ datasourceUrl: singleConnectionDatabaseUrl() });

// Cache in production too: duplicated route bundles must share one pool.
globalForCleanup.storageCleanupPrisma = storageCleanupPrisma;

export default storageCleanupPrisma;
