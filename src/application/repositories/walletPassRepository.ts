import "server-only";

import prisma, { type DbClient } from "./database";

export const findWalletPass = (studentId: string, db: DbClient = prisma) =>
  db.walletPass.findUnique({ where: { studentId } });

export const recordWalletPass = (
  data: { studentId: string; classId: string; objectId: string },
  db: DbClient
) =>
  db.walletPass.upsert({
    where: { studentId: data.studentId },
    create: data,
    update: {},
  });
