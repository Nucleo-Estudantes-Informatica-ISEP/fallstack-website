import "server-only";

import { PrismaClient } from "@prisma/client";

import { singleConnectionDatabaseUrl } from "@/config/env.database";

const globalForReadiness = globalThis as unknown as {
  readinessPrisma: PrismaClient | undefined;
};

// One additional slot per web process, budgeted separately from request traffic.
const readinessPrisma =
  globalForReadiness.readinessPrisma ??
  new PrismaClient({ datasourceUrl: singleConnectionDatabaseUrl() });

if (process.env.NODE_ENV !== "production")
  globalForReadiness.readinessPrisma = readinessPrisma;

export default readinessPrisma;
