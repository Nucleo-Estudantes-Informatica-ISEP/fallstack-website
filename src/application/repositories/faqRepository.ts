import "server-only";

import prisma from "./database";

export const findAllFaqEntries = () =>
  prisma.faqEntry.findMany({ orderBy: { order: "asc" } });

const ADMIN_SORTABLE_FIELDS = ["question", "order"] as const;
export type AdminFaqSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminFaqQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function faqWhere(search?: string) {
  return search
    ? { question: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function faqOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminFaqSortField)
    ? (sort as AdminFaqSortField)
    : undefined;
  if (!field) return [{ order: "asc" as const }, { question: "asc" as const }];
  return { [field]: order };
}

export const countFaqEntriesForAdmin = (search?: string) =>
  prisma.faqEntry.count({ where: faqWhere(search) });

export const findFaqEntriesForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminFaqQuery) =>
  prisma.faqEntry.findMany({
    where: faqWhere(search),
    orderBy: faqOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

export const findFaqEntryById = (id: string) =>
  prisma.faqEntry.findUnique({ where: { id } });

export const createFaqEntry = (data: {
  question: string;
  answer: string;
  order?: number;
}) => prisma.faqEntry.create({ data });

export const updateFaqEntry = (
  id: string,
  data: { question?: string; answer?: string; order?: number }
) => prisma.faqEntry.update({ where: { id }, data });

export const deleteFaqEntry = (id: string) =>
  prisma.faqEntry.delete({ where: { id } });

export const bulkUpdateFaqOrder = (updates: { id: string; order: number }[]) =>
  prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.faqEntry.update({ where: { id }, data: { order } })
    )
  );
