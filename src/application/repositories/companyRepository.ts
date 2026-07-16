import "server-only";

import prisma, { DbClient } from "./database";

export const findCompanyById = (id: string) =>
  prisma.company.findUnique({ where: { id } });

export const findCompanyName = (id: string, db: DbClient = prisma) =>
  db.company.findUnique({ where: { id }, select: { name: true } });

export const findCompanyByCode = (code: string) =>
  prisma.company.findUnique({ where: { code } });

export const findCompanyByName = (name: string) =>
  prisma.company.findUnique({ where: { name } });

export const findCompanies = () =>
  prisma.company.findMany({
    select: { id: true, name: true, tier: true, avatar: true },
  });

export const createCompany = (
  data: {
    id: string;
    name: string;
    tier: "DIAMOND" | "GOLD" | "SILVER" | "BRONZE";
  },
  db: DbClient = prisma
) => db.company.create({ data });

export const updateCompanyAvatar = (
  id: string,
  avatar: string | null,
  db: DbClient = prisma
) => db.company.update({ where: { id }, data: { avatar } });

export const createEmployee = (
  data: {
    id: string;
    name: string;
    linkedin?: string;
    companyId: string;
  },
  db: DbClient = prisma
) => db.employee.create({ data });

export const findCompanyEmployee = (companyId: string) =>
  prisma.employee.findFirst({ where: { companyId } });

export const findCompanyInterests = async (companyId: string) => {
  const employee = await prisma.employee.findFirst({
    where: { companyId },
    include: { user: { include: { interests: true } } },
  });
  return employee?.user.interests.map(({ name }) => name) ?? [];
};
