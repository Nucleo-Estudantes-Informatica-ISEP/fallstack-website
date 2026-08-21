import "server-only";

import type { Prisma } from "@prisma/client";

import { Email } from "@/types/Email";
import { Translations } from "@/domain/i18n/translations";

import prisma, { DbClient } from "./database";

const sessionSelect = {
  id: true,
  zitadelUserId: true,
  email: true,
  role: true,
  adminRole: true,
  active: true,
  student: { select: { id: true, code: true, name: true } },
  employee: {
    select: {
      id: true,
      name: true,
      companyId: true,
      company: {
        select: { id: true, name: true, avatar: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type SessionUserRecord = Prisma.UserGetPayload<{
  select: typeof sessionSelect;
}>;

export const findUserSessionById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: sessionSelect });

export const findUserSessionByZitadelUserId = (zitadelUserId: string) =>
  prisma.user.findUnique({ where: { zitadelUserId }, select: sessionSelect });

export const findUserSessionByEmail = (email: Email) =>
  prisma.user.findUnique({ where: { email }, select: sessionSelect });

export const findUserByEmail = (email: Email) =>
  prisma.user.findUnique({ where: { email } });

// Legacy-compatible app-row helper used by admin/domain services. User.id is
// always an application-owned UUID; callers may supply one when creating a
// 1:1 Student/Employee row in the same transaction.
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

export async function provisionZitadelUser(input: {
  zitadelUserId: string;
  email: Email;
  name?: string;
  isEmployee: boolean;
  isGlobalAdmin: boolean;
}) {
  const existingBySubject = await prisma.user.findUnique({
    where: { zitadelUserId: input.zitadelUserId },
    select: sessionSelect,
  });

  const role = input.isEmployee ? "EMPLOYEE" : undefined;
  const adminRole = input.isGlobalAdmin ? "SUPER_ADMIN" : null;

  if (existingBySubject) {
    return prisma.user.update({
      where: { id: existingBySubject.id },
      data: {
        email: input.email,
        adminRole,
        ...(role ? { role } : {}),
        ...(input.isGlobalAdmin && input.name ? { name: input.name } : {}),
      },
      select: sessionSelect,
    });
  }

  // This also provides a safe bridge for pre-cutover/test rows: preserve the
  // internal UUID and every Student/Employee FK, then attach the verified
  // ZITADEL subject. No application row is ever re-keyed to an IdP id.
  const existingByEmail = await prisma.user.findUnique({
    where: { email: input.email },
    select: sessionSelect,
  });

  if (existingByEmail) {
    if (
      existingByEmail.zitadelUserId &&
      existingByEmail.zitadelUserId !== input.zitadelUserId
    )
      throw new Error("Email is already linked to another AuthNEI identity");

    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        zitadelUserId: input.zitadelUserId,
        adminRole,
        ...(role ? { role } : {}),
        ...(input.isGlobalAdmin && input.name ? { name: input.name } : {}),
      },
      select: sessionSelect,
    });
  }

  return prisma.user.create({
    data: {
      zitadelUserId: input.zitadelUserId,
      email: input.email,
      role: input.isEmployee ? "EMPLOYEE" : "STUDENT",
      adminRole,
      name: input.isGlobalAdmin ? input.name : undefined,
    },
    select: sessionSelect,
  });
}

export const setUserRole = (
  id: string,
  role: "STUDENT" | "EMPLOYEE",
  db: DbClient = prisma
) => db.user.update({ where: { id }, data: { role } });

// Cascades to Student/Employee/interests via the DB foreign keys.
export const deleteUser = (id: string, db: DbClient = prisma) =>
  db.user.delete({ where: { id } });

export const deleteUserIfExists = (id: string, db: DbClient = prisma) =>
  db.user.deleteMany({ where: { id } });

async function interestIdsForNames(names: string[], db: DbClient) {
  const interests = await db.interest.findMany({
    select: { id: true, name: true },
  });
  const idsByName = new Map(
    interests.flatMap((interest) =>
      Object.values(Translations.fromJSON(interest.name).toJSON()).map(
        (name) => [name, interest.id] as const
      )
    )
  );
  return names.map((name) => {
    const id = idsByName.get(name);
    if (!id) throw new Error(`Unknown interest: ${name}`);
    return id;
  });
}

export const setUserInterests = async (
  id: string,
  interests: string[],
  db: DbClient = prisma
) => {
  const interestIds = await interestIdsForNames(interests, db);
  return db.user.update({
    where: { id },
    data: { interests: { set: interestIds.map((id) => ({ id })) } },
  });
};

export const connectUserInterests = async (
  id: string,
  interests: string[],
  db: DbClient = prisma
) => {
  const interestIds = await interestIdsForNames(interests, db);
  return db.user.update({
    where: { id },
    data: { interests: { connect: interestIds.map((id) => ({ id })) } },
  });
};

export const updateUserActive = (id: string, active: boolean) =>
  prisma.user.update({ where: { id }, data: { active } });

export const findEmployeeUserIds = async (companyId: string) => {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true },
  });
  return employees.map(({ id }) => id);
};
