import "server-only";

import prisma from "./database";

export const findInterests = () =>
  prisma.interest.findMany({ select: { id: true, name: true } });

export const findUserInterests = (userId: string) =>
  prisma.interest.findMany({
    where: { users: { some: { id: userId } } },
    select: { id: true, name: true },
  });

export const findInterestsForCompany = (companyId: string) =>
  prisma.interest.findMany({ where: { users: { some: { id: companyId } } } });

const ADMIN_SORTABLE_FIELDS = ["name"] as const;
export type AdminInterestSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminInterestQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function interestWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

export const countInterestsForAdmin = (search?: string) =>
  prisma.interest.count({ where: interestWhere(search) });

export const findInterestsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminInterestQuery) =>
  prisma.interest.findMany({
    where: interestWhere(search),
    orderBy: ADMIN_SORTABLE_FIELDS.includes(sort as AdminInterestSortField)
      ? { name: order }
      : { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, name: true, _count: { select: { users: true } } },
  });

export const findInterestById = (id: string) =>
  prisma.interest.findUnique({ where: { id } });

export const countInterestUsers = (id: string) =>
  prisma.user.count({ where: { interests: { some: { id } } } });

export const createInterest = (name: string) =>
  prisma.interest.create({ data: { name } });

export const updateInterestName = (id: string, name: string) =>
  prisma.interest.update({ where: { id }, data: { name } });

export const deleteInterest = (id: string) =>
  prisma.interest.delete({ where: { id } });
