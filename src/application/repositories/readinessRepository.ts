import "server-only";

import prisma from "./database";

export async function checkDatabaseReadiness() {
  // Prisma does not cancel this transaction through the outer AbortSignal.
  // Use its timeouts and retain unsettled work in the readiness service.
  await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SET LOCAL statement_timeout = '1000ms'`;
      await transaction.$queryRaw`SELECT 1`;
    },
    { maxWait: 500, timeout: 1500 }
  );
}
