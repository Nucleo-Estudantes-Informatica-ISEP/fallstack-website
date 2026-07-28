import "server-only";

import { Prisma } from "@prisma/client";

import config from "@/config";
import {
  savedStudentCommentData,
  savedStudentCompanyWhere,
} from "@/lib/savedStudentComments";

import prisma, { DbClient } from "./database";

export const isStudentSaved = async (companyId: string, code: string) =>
  !!(await prisma.savedStudent.findFirst({
    where: { companyId, student: { code } },
  }));

export const createSavedStudent = (
  studentId: string,
  employeeId: string,
  companyId: string,
  db: DbClient = prisma,
  comment?: string | null
) =>
  db.savedStudent.create({
    data: {
      studentId,
      employeeId,
      companyId,
      ...savedStudentCommentData(comment),
    },
  });

export const updateSavedStudentComment = (
  studentId: string,
  companyId: string,
  comment: string | null
) =>
  prisma.savedStudent.updateMany({
    where: savedStudentCompanyWhere(studentId, companyId),
    data: savedStudentCommentData(comment),
  });

export const findSavedStudent = (studentId: string, companyId: string) =>
  prisma.savedStudent.findFirst({
    where: { studentId, companyId },
  });

export const countStudentSaves = (code: string) =>
  prisma.savedStudent.count({ where: { student: { code } } });

export const countStudentSavesSince = (studentId: string, since: Date) =>
  prisma.savedStudent.count({
    where: { studentId, createdAt: { gte: since } },
  });

export const countCompanySaves = (companyId: string) =>
  prisma.savedStudent.count({ where: { companyId } });

export const countSavedStudentsByCompany = () =>
  prisma.savedStudent.groupBy({ by: ["companyId"], _count: { _all: true } });

export const findCompanyHistory = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { companyId },
    include: { savedBy: { include: { company: true } }, student: true },
    orderBy: { createdAt: "desc" },
  });

export const findCompanyHistoryWithInterests = (companyId: string) =>
  prisma.savedStudent.findMany({
    where: { companyId },
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
    where: { companyId },
    include: {
      student: { select: { id: true, name: true, code: true, cv: true } },
    },
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
    where: {
      savedBy: {
        user: { email: { equals: config.constants.neiContactEmail } },
      },
    },
  });

export const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";
