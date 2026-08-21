import "server-only";

import { Prisma } from "@prisma/client";

import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

import prisma, { DbClient } from "./database";

export const findAllFaqEntries = () =>
  prisma.faqEntry
    .findMany({ orderBy: { order: "asc" } })
    .then((entries) => entries.map(parseFaqEntry));

export const findFaqEntriesByIds = (ids: string[]) =>
  prisma.faqEntry.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

export const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

// New entries otherwise default to order: 0 (the Prisma column default),
// jumping ahead of every existing entry until an admin manually visits the
// reorder board to fix it - defaulting to the end of the list here means a
// plain "add" never needs that follow-up trip. Takes an optional `db` so
// the caller can run this inside the same transaction as the create that
// uses its result (see createFaqEntryForAdmin) - read outside the
// transaction, two concurrent admin creates could compute the same
// "next order" value.
export const findMaxFaqOrder = async (db: DbClient = prisma) => {
  const last = await db.faqEntry.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last?.order ?? -1;
};

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
    ? {
        OR: Object.values(Language).map((language) => ({
          question: {
            path: [language],
            string_contains: search,
            mode: "insensitive" as const,
          },
        })),
      }
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

export const findFaqEntriesForAdmin = async ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminFaqQuery) => {
  if (sort === "question") {
    // ponytail: trusted-admin data stays tiny; move to a generated PT column
    // if translated list sorting ever needs DB-scale pagination.
    const entries = (
      await prisma.faqEntry.findMany({ where: faqWhere(search) })
    )
      .map(parseFaqEntry)
      .sort((a, b) =>
        a.question.PT.localeCompare(b.question.PT, "pt", {
          sensitivity: "base",
        })
      );
    if (order === "desc") entries.reverse();
    return entries.slice((page - 1) * pageSize, page * pageSize);
  }

  return prisma.faqEntry
    .findMany({
      where: faqWhere(search),
      orderBy: faqOrderBy(sort, order),
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    .then((entries) => entries.map(parseFaqEntry));
};

export const findFaqEntryById = (id: string) =>
  prisma.faqEntry
    .findUnique({ where: { id } })
    .then((entry) => (entry ? parseFaqEntry(entry) : null));

const toJson = (value: TranslationValues) =>
  Translations.create(value).toJSON() as Prisma.InputJsonObject;

function parseFaqEntry<
  T extends { question: Prisma.JsonValue; answer: Prisma.JsonValue },
>(entry: T) {
  return {
    ...entry,
    question: Translations.fromJSON(entry.question).toJSON(),
    answer: Translations.fromJSON(entry.answer).toJSON(),
  };
}

export const createFaqEntry = (
  data: {
    question: TranslationValues;
    answer: TranslationValues;
    order?: number;
  },
  db: DbClient = prisma
) =>
  db.faqEntry
    .create({
      data: {
        ...data,
        question: toJson(data.question),
        answer: toJson(data.answer),
      },
    })
    .then(parseFaqEntry);

export const updateFaqEntry = (
  id: string,
  data: {
    question?: TranslationValues;
    answer?: TranslationValues;
    order?: number;
  }
) =>
  prisma.faqEntry
    .update({
      where: { id },
      data: {
        ...data,
        question: data.question ? toJson(data.question) : undefined,
        answer: data.answer ? toJson(data.answer) : undefined,
      },
    })
    .then(parseFaqEntry);

export const deleteFaqEntry = (id: string) =>
  prisma.faqEntry.delete({ where: { id } });

export const bulkUpdateFaqOrder = (updates: { id: string; order: number }[]) =>
  prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.faqEntry.update({ where: { id }, data: { order } })
    )
  );
