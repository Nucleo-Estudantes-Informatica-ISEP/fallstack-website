import "server-only";

import type { Prisma } from "@prisma/client";

import prisma, { DbClient } from "./database";

const sessionSelect = {
  id: true,
  role: true,
  isAdmin: true,
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

export const findUserSessionByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email },
    select: sessionSelect,
  });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const upsertUser = (
  data: {
    id: string;
    email: string;
    role: "STUDENT" | "EMPLOYEE";
  },
  db: DbClient = prisma
) =>
  db.user.upsert({
    where: { id: data.id },
    update: {},
    create: data,
  });

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

export const findEmployeeUserIds = async (companyId: string) => {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true },
  });
  return employees.map(({ id }) => id);
};
