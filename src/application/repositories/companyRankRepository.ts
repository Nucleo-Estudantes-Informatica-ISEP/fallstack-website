import "server-only";

import { Prisma } from "@prisma/client";

import prisma, { DbClient } from "./database";

export interface CompanyRankStyleInput {
  gradientFromColor: string;
  gradientFromStop: string;
  gradientToColor: string;
  gradientToStop: string;
  hasInternalPage?: boolean;
  showsPromoVideo?: boolean;
}

export const findAllCompanyRanks = () =>
  prisma.companyRank.findMany({
    orderBy: { order: "asc" },
    include: { style: true },
  });

export const findCompanyRanksByIds = (ids: string[]) =>
  prisma.companyRank.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

export const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

// Mirrors faqRepository.findMaxFaqOrder - see that function's comment for
// why a new rank defaults to the end of the list, and why this takes an
// optional `db` for use inside the same transaction as the create.
export const findMaxCompanyRankOrder = async (db: DbClient = prisma) => {
  const last = await db.companyRank.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last?.order ?? -1;
};

const ADMIN_SORTABLE_FIELDS = ["name", "order"] as const;
export type AdminCompanyRankSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminCompanyRankQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function rankWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function rankOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(
    sort as AdminCompanyRankSortField
  )
    ? (sort as AdminCompanyRankSortField)
    : undefined;
  if (!field) return [{ order: "asc" as const }, { name: "asc" as const }];
  return { [field]: order };
}

export const countCompanyRanksForAdmin = (search?: string) =>
  prisma.companyRank.count({ where: rankWhere(search) });

export const findCompanyRanksForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminCompanyRankQuery) =>
  prisma.companyRank.findMany({
    where: rankWhere(search),
    orderBy: rankOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { style: true },
  });

export const findCompanyRankById = (id: string) =>
  prisma.companyRank.findUnique({ where: { id }, include: { style: true } });

export const createCompanyRank = (
  data: { name: string; order?: number; style: CompanyRankStyleInput },
  db: DbClient = prisma
) =>
  db.companyRank.create({
    data: {
      name: data.name,
      order: data.order,
      style: { create: data.style },
    },
    include: { style: true },
  });

export const updateCompanyRank = (
  id: string,
  data: {
    name?: string;
    order?: number;
    style?: Partial<CompanyRankStyleInput>;
  }
) =>
  prisma.companyRank.update({
    where: { id },
    data: {
      name: data.name,
      order: data.order,
      style: data.style ? { update: data.style } : undefined,
    },
    include: { style: true },
  });

export const deleteCompanyRank = (id: string) =>
  prisma.companyRank.delete({ where: { id } });

export const countCompaniesForRank = (rankId: string) =>
  prisma.company.count({ where: { rankId } });

export const bulkUpdateCompanyRankOrder = (
  updates: { id: string; order: number }[]
) =>
  prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.companyRank.update({ where: { id }, data: { order } })
    )
  );
