import "server-only";

import { Email } from "@/types/Email";
import prisma from "./database";

export const findUserWithProfile = (id: string) =>
  prisma.user.findUserWithProfile(id);

export const findUserWithEmployeeByEmail = (email: Email) =>
  prisma.user.findUnique({
    where: { email },
    include: { employee: { include: { company: true } }, student: true },
  });

export const findUserByEmail = (email: Email) =>
  prisma.user.findUnique({ where: { email } });

export const upsertUser = (data: {
  id: string;
  email: Email;
  role: "STUDENT" | "EMPLOYEE";
}) =>
  prisma.user.upsert({
    where: { id: data.id },
    update: {},
    create: data,
  });

export const setUserInterests = (id: string, interests: string[]) =>
  prisma.user.update({
    where: { id },
    data: { interests: { set: interests.map((name) => ({ name })) } },
  });

export const connectUserInterests = (id: string, interests: string[]) =>
  prisma.user.update({
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
