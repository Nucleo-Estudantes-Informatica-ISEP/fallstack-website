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
