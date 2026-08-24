import "server-only";

import { Prisma } from "@prisma/client";

import {
  parseTranslatedField,
  toTranslationJson,
  type TranslationValues,
} from "@/domain/i18n/translations";

import prisma from "./database";
import { translatedFieldWhere } from "./translationRepositoryHelpers";

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

const interestWhere = (search?: string) => translatedFieldWhere("name", search);

export const findInterestsForAdmin = async ({
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
  if (order === "desc") interests.reverse();
  return interests;
};

export const findInterestById = (id: string) =>
  prisma.interest
    .findUnique({ where: { id } })
    .then((interest) => (interest ? parseInterest(interest) : null));

export const countInterestUsers = (id: string) =>
  prisma.user.count({ where: { interests: { some: { id } } } });

function parseInterest<T extends { name: Prisma.JsonValue }>(interest: T) {
  return parseTranslatedField(interest, "name");
}

export const isUniqueInterestNameError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const createInterest = (name: TranslationValues) =>
  prisma.interest
    .create({ data: { name: toTranslationJson(name) } })
    .then(parseInterest);

export const updateInterestName = (id: string, name: TranslationValues) =>
  prisma.interest
    .update({ where: { id }, data: { name: toTranslationJson(name) } })
    .then(parseInterest);

export const deleteInterest = (id: string) =>
  prisma.interest.delete({ where: { id } });
