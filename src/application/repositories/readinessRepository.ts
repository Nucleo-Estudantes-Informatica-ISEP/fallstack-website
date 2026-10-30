import "server-only";

import prisma from "./database";

export async function checkDatabaseReadiness() {
  // Use the application's pool and credentials, without reading application data.
  await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SET LOCAL statement_timeout = '1000ms'`;
      await transaction.$queryRaw`SELECT 1`;
    },
    { maxWait: 500, timeout: 1500 }
  );
}
