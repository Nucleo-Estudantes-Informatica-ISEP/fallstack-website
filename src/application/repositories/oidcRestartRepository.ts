import "server-only";

import prisma from "./database";

export async function saveOidcRestart(token: string, destination: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.oidcRestartDestination.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
    prisma.oidcRestartDestination.create({
      data: {
        token,
        destination,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      },
    }),
  ]);
}

export async function consumeOidcRestart(token: string) {
  const rows = await prisma.$queryRaw<Array<{ destination: string }>>`
    DELETE FROM "OidcRestartDestination"
    WHERE "token" = ${token} AND "expiresAt" > ${new Date().toISOString()}::timestamp
    RETURNING "destination"
  `;
  return rows[0]?.destination;
}
