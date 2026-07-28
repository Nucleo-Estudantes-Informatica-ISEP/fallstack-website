import "server-only";

import type { AdminRole, Prisma } from "@prisma/client";

import { Email } from "@/types/Email";

import prisma, { DbClient } from "./database";

const ADMIN_SORTABLE_FIELDS = ["name", "email"] as const;
export type AdminAccountSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminAccountQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

const adminSelect = {
  id: true,
  email: true,
  name: true,
  adminRole: true,
  active: true,
} satisfies Prisma.UserSelect;

function adminWhere(search?: string): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { adminRole: { not: null } };
  if (!search) return base;
  return {
    ...base,
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };
}

export const countAdminsForAdmin = (search?: string) =>
  prisma.user.count({ where: adminWhere(search) });

export const countActiveSuperAdmins = () =>
  prisma.user.count({ where: { adminRole: "SUPER_ADMIN", active: true } });

export const findAdminsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminAccountQuery) =>
  prisma.user.findMany({
    where: adminWhere(search),
    orderBy: ADMIN_SORTABLE_FIELDS.includes(sort as AdminAccountSortField)
      ? { [sort as AdminAccountSortField]: order }
      : { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: adminSelect,
  });

export const findAdminAccountById = (id: string) =>
  prisma.user.findFirst({
    where: { id, adminRole: { not: null } },
    select: adminSelect,
  });

export const createAdminUser = (
  data: { id: string; email: Email; name: string; adminRole: AdminRole },
  db: DbClient = prisma
) =>
  db.user.create({
    data: { ...data, role: null },
    select: adminSelect,
  });

export const updateAdminUserFields = (
  id: string,
  data: { name?: string; adminRole?: AdminRole },
  db: DbClient = prisma
) => db.user.update({ where: { id }, data, select: adminSelect });
