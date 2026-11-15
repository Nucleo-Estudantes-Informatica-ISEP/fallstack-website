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

export const findAttendanceForExport = async (day: number) => {
  const rows = await prisma.sessionCheckIn.findMany({
    where: { sessionDay: day },
    orderBy: [{ checkedInAt: "asc" }, { id: "asc" }],
    select: {
      checkedInAt: true,
      student: { select: { name: true, user: { select: { email: true } } } },
      sessionDay: true,
      sessionStartTime: true,
      sessionEndTime: true,
      sessionActivity: true,
    },
  });
  return rows.map((row) => ({
    checkedInAt: row.checkedInAt,
    student: row.student,
    session: {
      day: row.sessionDay,
      startTime: row.sessionStartTime,
      endTime: row.sessionEndTime,
      activity: row.sessionActivity,
    },
  }));
};
