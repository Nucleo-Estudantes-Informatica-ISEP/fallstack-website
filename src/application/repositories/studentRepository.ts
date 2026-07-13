import "server-only";

import { Email } from "@/types/Email";
import prisma, { DbClient } from "./database";

export const findStudentByCode = (code: string, db: DbClient = prisma) =>
  db.student.findUnique({ where: { code } });

export const findStudentProfileByCode = (code: string) =>
  prisma.student.findUnique({
    where: { code },
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
    year: string;
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
