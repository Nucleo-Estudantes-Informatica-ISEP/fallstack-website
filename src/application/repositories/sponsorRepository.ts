import "server-only";

import prisma from "./database";

export const findActiveSponsors = () =>
  prisma.sponsor.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, logo: true, website: true, order: true },
  });

const ADMIN_SORTABLE_FIELDS = ["name", "order", "active"] as const;
export type AdminSponsorSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminSponsorQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function sponsorWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function sponsorOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminSponsorSortField)
    ? (sort as AdminSponsorSortField)
    : undefined;
  if (!field) return [{ order: "asc" as const }, { name: "asc" as const }];
  return { [field]: order };
}

export const countSponsorsForAdmin = (search?: string) =>
  prisma.sponsor.count({ where: sponsorWhere(search) });

export const findAllSponsorsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminSponsorQuery) =>
  prisma.sponsor.findMany({
    where: sponsorWhere(search),
    orderBy: sponsorOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

export const findSponsorById = (id: string) =>
  prisma.sponsor.findUnique({ where: { id } });

export const createSponsor = (data: {
  name: string;
  logo: string;
  website?: string | null;
  active?: boolean;
  order?: number;
}) => prisma.sponsor.create({ data });

export const updateSponsor = (
  id: string,
  data: {
    name?: string;
    logo?: string;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) => prisma.sponsor.update({ where: { id }, data });
