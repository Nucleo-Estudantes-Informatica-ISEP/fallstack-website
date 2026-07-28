import "server-only";

import type { Prisma } from "@prisma/client";

import prisma, { DbClient } from "./database";

const ADMIN_SORTABLE_FIELDS = ["name"] as const;
export type AdminEmployeeSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminEmployeeQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function employeeWhere(search?: string): Prisma.EmployeeWhereInput {
  if (!search) return {};
  return { name: { contains: search, mode: "insensitive" } };
}

export const countEmployeesForAdmin = (search?: string) =>
  prisma.employee.count({ where: employeeWhere(search) });

export const findEmployeesForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminEmployeeQuery) =>
  prisma.employee.findMany({
    where: employeeWhere(search),
    orderBy: ADMIN_SORTABLE_FIELDS.includes(sort as AdminEmployeeSortField)
      ? { name: order }
      : { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { user: true, company: { select: { id: true, name: true } } },
  });

export const findEmployeeProfileById = (id: string) =>
  prisma.employee.findUnique({
    where: { id },
    include: { user: true, company: { select: { id: true, name: true } } },
  });

export const updateEmployeeFields = (
  id: string,
  data: { name?: string; linkedin?: string | null; companyId?: string },
  db: DbClient = prisma
) => db.employee.update({ where: { id }, data });
