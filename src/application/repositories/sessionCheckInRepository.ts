import "server-only";

import { Prisma, type AttendancePeriod } from "@prisma/client";

import prisma, { DbClient } from "./database";

export const findStudentForCheckIn = (code: string, db: DbClient = prisma) =>
  db.student.findUnique({ where: { code }, select: { id: true, name: true } });

export const createSessionCheckIn = (
  input: {
    day: number;
    period: AttendancePeriod;
    studentId: string;
    scannedById: string;
  },
  db: DbClient = prisma
) =>
  db.attendanceCheckIn.create({
    data: input,
    select: {
      id: true,
      day: true,
      period: true,
      studentId: true,
      scannedById: true,
      checkedInAt: true,
    },
  });

export const countSessionCheckIns = (
  period: { day: number; period: AttendancePeriod },
  db: DbClient = prisma
) =>
  db.attendanceCheckIn.count({
    where: { day: period.day, period: period.period },
  });

export const isSessionCheckInUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const findAttendanceForExport = (day: number) =>
  prisma.attendanceCheckIn.findMany({
    where: { day },
    orderBy: [{ checkedInAt: "asc" }, { id: "asc" }],
    select: {
      checkedInAt: true,
      day: true,
      period: true,
      student: { select: { name: true, user: { select: { email: true } } } },
    },
  });
