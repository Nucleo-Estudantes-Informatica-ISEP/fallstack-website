import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "./database";

export const isStudentSaved = async (companyId: string, code: string) =>
  !!(await prisma.savedStudent.findFirst({
    where: { AND: [{ savedBy: { companyId } }, { student: { code } }] },
  }));

export const createSavedStudent = (studentId: string, employeeId: string) =>
  prisma.savedStudent.create({ data: { studentId, employeeId } });

export const findSavedStudent = (studentId: string, companyId: string) =>
  prisma.savedStudent.findFirst({
    where: { studentId, savedBy: { companyId } },
  });

export const countStudentSaves = (code: string) =>
  prisma.savedStudent.count({ where: { student: { code } } });

export const countStudentSavesSince = (studentId: string, since: Date) =>
  prisma.savedStudent.count({
    where: { studentId, createdAt: { gte: since } },
  });

export const countCompanySaves = (companyId: string) =>
  prisma.savedStudent.count({ where: { savedBy: { companyId } } });

export const findCompanyHistory = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { savedBy: { companyId } },
    include: { savedBy: { include: { company: true } }, student: true },
    orderBy: { createdAt: "desc" },
  });

export const findCompanyHistoryWithInterests = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { savedBy: { companyId } },
    include: {
      student: {
        select: {
          name: true,
          user: { include: { interests: true } },
          code: true,
          cv: true,
        },
      },
      savedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

export const findCompanySavedStudentsWithCv = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { savedBy: { companyId } },
    include: {
      student: { select: { id: true, name: true, code: true, cv: true } },
    },
  });

export const findCompanySavesForExport = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { savedBy: { companyId } },
    include: { student: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

export const findStudentHistory = (studentId: string) =>
  prisma.savedStudent.findMany({
    where: { studentId },
    include: { student: true, savedBy: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

export const findAdminScans = () =>
  prisma.savedStudent.findMany({
    distinct: ["studentId"],
    select: {
      studentId: true,
      createdAt: true,
      student: { include: { user: true } },
      savedBy: { select: { id: true } },
    },
    where: { savedBy: { user: { email: { equals: "info@nei-isep.org" } } } },
  });

export const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";
