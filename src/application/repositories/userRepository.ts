import "server-only";

import type { Prisma } from "@prisma/client";

import { Email } from "@/types/Email";

import prisma, { DbClient } from "./database";

const sessionSelect = {
  id: true,
  role: true,
  isAdmin: true,
  active: true,
  student: { select: { id: true, code: true, name: true } },
  employee: {
    select: {
      id: true,
      name: true,
      companyId: true,
      company: {
        select: { id: true, name: true, tier: true, avatar: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

export const findUserSessionById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: sessionSelect });

export const findUserSessionByEmail = (email: Email) =>
  prisma.user.findUnique({
    where: { email },
    select: sessionSelect,
  });

export const findUserByEmail = (email: Email) =>
  prisma.user.findUnique({ where: { email } });

export const upsertUser = (
  data: {
    id: string;
    email: Email;
    role: "STUDENT" | "EMPLOYEE";
  },
  db: DbClient = prisma
) =>
  db.user.upsert({
    where: { id: data.id },
    update: {},
    create: data,
  });

// Re-keys an existing User row onto a new id (e.g. adopting a new Supabase
// auth id for the same person via a different sign-in provider). Safe to do
// as a plain id update: Student.id, Employee.id, and _InterestToUser's User
// FK are all ON UPDATE CASCADE at the DB level, so their rows follow the
// rename automatically.
export const relinkUserId = (
  oldId: string,
  newId: string,
  db: DbClient = prisma
) => db.user.update({ where: { id: oldId }, data: { id: newId } });

// Cascades to Student/Employee/interests via the same ON DELETE CASCADE FKs.
export const deleteUser = (id: string, db: DbClient = prisma) =>
  db.user.delete({ where: { id } });

export const setUserInterests = (
  id: string,
  interests: string[],
  db: DbClient = prisma
) =>
  db.user.update({
    where: { id },
    data: { interests: { set: interests.map((name) => ({ name })) } },
  });

export const connectUserInterests = (
  id: string,
  interests: string[],
  db: DbClient = prisma
) =>
  db.user.update({
    where: { id },
    data: { interests: { connect: interests.map((name) => ({ name })) } },
  });

export const updateUserActive = (id: string, active: boolean) =>
  prisma.user.update({ where: { id }, data: { active } });

export const findEmployeeUserIds = async (companyId: string) => {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true },
  });
  return employees.map(({ id }) => id);
};
