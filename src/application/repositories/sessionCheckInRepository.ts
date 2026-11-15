import "server-only";

import { Prisma } from "@prisma/client";

import prisma, { DbClient } from "./database";

export const findScheduleEventForCheckIn = (
  sessionId: string,
  db: DbClient = prisma
) => db.scheduleEvent.findUnique({ where: { id: sessionId } });

export const findStudentForCheckIn = (code: string, db: DbClient = prisma) =>
  db.student.findUnique({ where: { code } });

export const createSessionCheckIn = (
  input: { sessionId: string; studentId: string; scannedById: string },
  db: DbClient = prisma
) =>
  db.sessionCheckIn.create({
    data: input,
    select: {
      id: true,
      sessionId: true,
      studentId: true,
      scannedById: true,
      checkedInAt: true,
    },
  });

export const isSessionCheckInUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";
