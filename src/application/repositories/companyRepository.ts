import "server-only";

import prisma from "./database";

export const findCompanyById = (id: string) =>
  prisma.company.findUnique({ where: { id } });

export const findCompanyName = (id: string) =>
  prisma.company.findUnique({ where: { id }, select: { name: true } });

export const findCompanyByCode = (code: string) =>
  prisma.company.findUnique({ where: { code } });

export const findCompanyByName = (name: string) =>
  prisma.company.findUnique({ where: { name } });

export const findCompanies = () => prisma.company.findMany();

export async function findCompaniesWithUsers() {
  const companies = await prisma.company.findMany();
  const users = await prisma.user.findMany({
    where: { id: { in: companies.map(({ id }) => id) } },
  });
  return companies.map((company) => ({
    ...company,
    user: users.find(({ id }) => id === company.id) ?? null,
  }));
}

export const createCompany = (data: {
  id: string;
  name: string;
  tier: "DIAMOND" | "GOLD" | "SILVER" | "BRONZE";
}) => prisma.company.create({ data });

export const updateCompanyAvatar = (id: string, avatar: string | null) =>
  prisma.company.update({ where: { id }, data: { avatar } });

export const createEmployee = (data: {
  id: string;
  name: string;
  linkedin?: string;
  companyId: string;
}) => prisma.employee.create({ data });

export const findCompanyEmployee = (companyId: string) =>
  prisma.employee.findFirst({ where: { companyId } });

export const findCompanyInterests = async (companyId: string) => {
  const employee = await prisma.employee.findFirst({
    where: { companyId },
    include: { user: { include: { interests: true } } },
  });
  return employee?.user.interests.map(({ name }) => name) ?? [];
};

export async function findInterestMatchingCompanies() {
  const companies = await prisma.company.findMany();
  const users = await prisma.user.findMany({
    where: { id: { in: companies.map(({ id }) => id) }, isAdmin: false },
    include: { interests: true },
  });
  return companies.flatMap((company) => {
    const user = users.find(({ id }) => id === company.id);
    return user ? [{ ...company, user }] : [];
  });
}
