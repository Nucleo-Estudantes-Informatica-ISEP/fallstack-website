import "server-only";

import type { Prisma } from "@prisma/client";

import { Email } from "@/types/Email";
import type { StudentYear } from "@/domain/Student/year";

import prisma, { DbClient } from "./database";

export const findStudentByCode = (code: string, db: DbClient = prisma) =>
  db.student.findUnique({ where: { code } });

export const findStudentProfileByCode = (code: string) =>
  prisma.student.findUnique({
    where: { code },
    include: { user: { include: { interests: true } } },
  });

export const findStudentProfileById = (id: string) =>
  prisma.student.findUnique({
    where: { id },
    include: { user: { include: { interests: true } } },
  });

export const findStudentWithUserByCode = (code: string) =>
  prisma.student.findUnique({ where: { code }, include: { user: true } });

export const findStudentByEmail = (email: Email) =>
  prisma.student.findFirst({ where: { user: { email } } });

export const findStudentAction = (studentId: string, actionId: string) =>
  prisma.student.findUnique({
    where: { id: studentId },
    include: { actionCompletions: { where: { actionId } } },
  });

export const createStudent = (
  input: {
    userId: string;
    code: string;
    name: string;
    bio?: string;
    year: StudentYear;
  },
  db: DbClient = prisma
) =>
  db.student.create({
    data: {
      id: input.userId,
      code: input.code,
      name: input.name,
      bio: input.bio?.trim(),
      year: input.year,
    },
  });

export const updateStudentProfile = (
  code: string,
  data: { bio?: string; linkedin?: string; github?: string },
  db: DbClient = prisma
) =>
  db.student.update({
    where: { code },
    data: { ...data, bio: data.bio?.trim() },
  });

export const updateStudentMedia = (
  id: string,
  data: { avatar?: string | null; cv?: string | null },
  db: DbClient = prisma
) => db.student.update({ where: { id }, data });

export const updateStudentAvatar = (code: string, avatar: string) =>
  prisma.student.update({ where: { code }, data: { avatar } });

export const updateStudentCv = (
  code: string,
  cv: string,
  db: DbClient = prisma
) => db.student.update({ where: { code }, data: { cv } });

export const countStudents = () =>
  prisma.student.count({ where: { user: { AND: [{ role: "STUDENT" }] } } });

export const findAllStudents = () =>
  prisma.student.findMany({
    where: { user: { AND: [{ role: "STUDENT" }] } },
    select: {
      id: true,
      code: true,
      name: true,
      bio: true,
      year: true,
      cv: true,
      linkedin: true,
      user: true,
      avatar: true,
    },
  });

export const findStudentsForGiveaway = () =>
  prisma.student.findMany({
    where: { user: { AND: [{ role: "STUDENT" }, { isAdmin: false }] } },
    include: {
      user: true,
      actionCompletions: { select: { action: { select: { points: true } } } },
    },
  });

export const findStudentAvatar = (id: string) =>
  prisma.student.findUnique({ where: { id }, select: { avatar: true } });

export const findStudentInterests = (id: string) =>
  prisma.student.findMany({
    where: { id },
    select: { user: { select: { interests: true } } },
  });

const ADMIN_SORTABLE_FIELDS = ["name", "code", "year"] as const;
export type AdminStudentSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminStudentQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function studentWhere(search?: string): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = { user: { role: "STUDENT" } };
  if (!search) return base;
  return {
    ...base,
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ],
  };
}

function studentOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminStudentSortField)
    ? (sort as AdminStudentSortField)
    : undefined;
  return field ? { [field]: order } : { name: "asc" as const };
}

export const countStudentsForAdmin = (search?: string) =>
  prisma.student.count({ where: studentWhere(search) });

export const findStudentsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminStudentQuery) =>
  prisma.student.findMany({
    where: studentWhere(search),
    orderBy: studentOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { user: true },
  });

export const updateStudentFields = (
  id: string,
  data: {
    name?: string;
    bio?: string | null;
    year?: StudentYear;
    linkedin?: string | null;
    github?: string | null;
  },
  db: DbClient = prisma
) => db.student.update({ where: { id }, data });
