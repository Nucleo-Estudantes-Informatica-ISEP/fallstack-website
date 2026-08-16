import "server-only";

import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV !== "production" ? ["info", "warn", "error"] : [],
  });

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

// The type Prisma infers for an interactive transaction's callback argument,
// derived rather than hand-duplicated so it stays in sync with the `prisma`
// singleton above.
export type DbClient =
  typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const withTransaction = <T>(
  fn: (tx: Exclude<DbClient, typeof prisma>) => Promise<T>
) => prisma.$transaction(fn);
