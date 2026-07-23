import "server-only";

import type { Tier } from "@prisma/client";

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

export const findActiveCompanies = () =>
  prisma.company.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      tier: true,
      avatar: true,
      website: true,
      order: true,
    },
  });

export const findCompanyDisplayByName = (name: string) =>
  prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, active: true },
    select: { id: true, name: true, tier: true, avatar: true, website: true },
  });

const ADMIN_SORTABLE_FIELDS = ["name", "tier", "order", "active"] as const;
export type AdminCompanySortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminCompanyQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function companyWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function companyOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminCompanySortField)
    ? (sort as AdminCompanySortField)
    : undefined;
  if (!field) return [{ tier: "asc" as const }, { order: "asc" as const }];
  return { [field]: order };
}

export const countCompaniesForAdmin = (search?: string) =>
  prisma.company.count({ where: companyWhere(search) });

export const findAllCompaniesForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminCompanyQuery) =>
  prisma.company.findMany({
    where: companyWhere(search),
    orderBy: companyOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      tier: true,
      avatar: true,
      website: true,
      active: true,
      order: true,
    },
  });

// All companies, unpaginated, for the tier board - it needs every
// company visible at once to drag between tiers, not a page at a time.
export const findAllCompaniesForTierBoard = () =>
  prisma.company.findMany({
    orderBy: [{ tier: "asc" }, { order: "asc" }],
    select: { id: true, name: true, avatar: true, tier: true, order: true },
  });

export const bulkUpdateCompanyTierOrder = (
  updates: { id: string; tier: Tier; order: number }[]
) =>
  prisma.$transaction(
    updates.map(({ id, tier, order }) =>
      prisma.company.update({ where: { id }, data: { tier, order } })
    )
  );

export const createCompanyDisplay = (data: {
  name: string;
  tier: Tier;
  avatar?: string | null;
  website?: string | null;
  active?: boolean;
  order?: number;
}) => prisma.company.create({ data });

export const updateCompanyDisplay = (
  id: string,
  data: {
    name?: string;
    tier?: Tier;
    avatar?: string | null;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) => prisma.company.update({ where: { id }, data });

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
