import "server-only";

import { Prisma } from "@prisma/client";

import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

import prisma from "./database";

export const findInterests = () =>
  prisma.interest
    .findMany({ select: { id: true, name: true } })
    .then((interests) => interests.map(parseInterest));

export const findUserInterests = (userId: string) =>
  prisma.interest
    .findMany({
      where: { users: { some: { id: userId } } },
      select: { id: true, name: true },
    })
    .then((interests) => interests.map(parseInterest));

export const findInterestsForCompany = (companyId: string) =>
  prisma.interest
    .findMany({ where: { users: { some: { id: companyId } } } })
    .then((interests) => interests.map(parseInterest));

export interface AdminInterestQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function interestWhere(search?: string) {
  return search
    ? {
        OR: Object.values(Language).map((language) => ({
          name: {
            path: [language],
            string_contains: search,
            mode: "insensitive" as const,
          },
        })),
      }
    : undefined;
}

export const countInterestsForAdmin = (search?: string) =>
  prisma.interest.count({ where: interestWhere(search) });

export const findInterestsForAdmin = async ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminInterestQuery) => {
  // ponytail: trusted-admin data stays tiny; move to a generated PT column
  // if translated list sorting ever needs DB-scale pagination.
  const interests = (
    await prisma.interest.findMany({
      where: interestWhere(search),
      select: { id: true, name: true, _count: { select: { users: true } } },
    })
  )
    .map(parseInterest)
    .sort((a, b) =>
      a.name.PT.localeCompare(b.name.PT, "pt", { sensitivity: "base" })
    );
  if (order === "desc" && sort === "name") interests.reverse();
  return interests.slice((page - 1) * pageSize, page * pageSize);
};

export const findInterestById = (id: string) =>
  prisma.interest
    .findUnique({ where: { id } })
    .then((interest) => (interest ? parseInterest(interest) : null));

export const countInterestUsers = (id: string) =>
  prisma.user.count({ where: { interests: { some: { id } } } });

const toJson = (value: TranslationValues) =>
  Translations.create(value).toJSON() as Prisma.InputJsonObject;

function parseInterest<T extends { name: Prisma.JsonValue }>(interest: T) {
  return {
    ...interest,
    name: Translations.fromJSON(interest.name).toJSON(),
  };
}

export const createInterest = (name: TranslationValues) =>
  prisma.interest.create({ data: { name: toJson(name) } }).then(parseInterest);

export const updateInterestName = (id: string, name: TranslationValues) =>
  prisma.interest
    .update({ where: { id }, data: { name: toJson(name) } })
    .then(parseInterest);

export const deleteInterest = (id: string) =>
  prisma.interest.delete({ where: { id } });
