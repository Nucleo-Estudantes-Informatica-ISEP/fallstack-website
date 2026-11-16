import "server-only";

import prisma from "./database";

export const findCompanyByInviteCodeHash = (employeeInviteCodeHash: string) =>
  prisma.company.findUnique({ where: { employeeInviteCodeHash } });

export const updateCompanyInviteCodeHash = (
  companyId: string,
  employeeInviteCodeHash: string,
  employeeInviteCodeUpdatedAt: Date
) =>
  prisma.company.update({
    where: { id: companyId },
    data: { employeeInviteCodeHash, employeeInviteCodeUpdatedAt },
    select: { employeeInviteCodeUpdatedAt: true },
  });
