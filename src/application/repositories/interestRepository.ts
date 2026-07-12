import "server-only";

import prisma from "./database";

export const findInterests = () => prisma.interest.findMany();

export const findUserInterests = (userId: string) =>
  prisma.interest.findMany({
    where: { users: { some: { id: userId } } },
    select: { id: true, name: true },
  });

export const findInterestsForCompany = (companyId: string) =>
  prisma.interest.findMany({ where: { users: { some: { id: companyId } } } });

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
