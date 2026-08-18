import "server-only";

import prisma from "./database";

export const findCompanyByInviteCodeHash = (employeeInviteCodeHash: string) =>
  prisma.company.findUnique({ where: { employeeInviteCodeHash } });
