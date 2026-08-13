import "server-only";

import { Prisma } from "@prisma/client";

import { HttpError } from "@/types/HttpError";

import {
  bulkUpdateCompanyRankBoard,
  countCompaniesForAdmin,
  createCompany,
  createCompanyDisplay,
  deleteCompanyProfile,
  findActiveCompanies,
  findAllCompaniesForAdmin,
  findAllCompaniesForRankBoard,
  findCompanies,
  findCompanyById,
  findCompanyByName,
  findCompanyDisplayByName,
  findCompanyInterests,
  findCompanyWithContent,
  setCompanyInterests,
  updateCompanyAvatar,
  updateCompanyDisplay,
  upsertCompanyDisplayStyle,
  upsertCompanyProfile,
  type AdminCompanyQuery,
} from "../repositories/companyRepository";
import { findInterestsForCompany } from "../repositories/interestRepository";
import { withTransaction } from "../repositories/transaction";

export const getCompanies = () => findCompanies();
export const getCompany = (id: string) => findCompanyById(id);
export const getCompanyInterests = (id: string) => findCompanyInterests(id);
export const getCompanyWithContent = (id: string) => findCompanyWithContent(id);

export const getActiveCompanies = () => findActiveCompanies();
export const getCompanyDisplayByName = (name: string) =>
  findCompanyDisplayByName(name);

export async function listCompaniesForAdmin(query: AdminCompanyQuery) {
  const [items, totalCount] = await Promise.all([
    findAllCompaniesForAdmin(query),
    countCompaniesForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createCompanyForAdmin(input: {
  name: string;
  rankId: string;
  avatar?: string | null;
  website?: string | null;
  active?: boolean;
  order?: number;
}) {
  return createCompanyDisplay(input);
}

export async function updateCompanyForAdmin(
  id: string,
  input: {
    name?: string;
    rankId?: string;
    avatar?: string | null;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) {
  if (!(await findCompanyById(id))) throw new HttpError("Not found", 404);
  return updateCompanyDisplay(id, input);
}

export const getCompaniesForRankBoard = () => findAllCompaniesForRankBoard();

export async function updateCompanyRankBoard(
  updates: { id: string; rankId: string; order: number }[]
) {
  if (updates.length === 0) return;
  await bulkUpdateCompanyRankBoard(updates);
}

export async function registerCompany(input: {
  userId: string;
  name: string;
  rankId: string;
  avatarUrl?: string;
}) {
  if (await findCompanyById(input.userId))
    throw new HttpError("Company already exists", 401);
  return withTransaction(async (tx) => {
    const company = await createCompany(
      { id: input.userId, name: input.name, rankId: input.rankId },
      tx
    );
    await updateCompanyAvatar(company.id, input.avatarUrl ?? null, tx);
    return company;
  });
}

export async function getInterestsByCompanyName(companyName: string) {
  const company = await findCompanyByName(companyName);
  if (!company) throw new Error("Company not found");
  return (await findInterestsForCompany(company.id)).map(({ name }) => name);
}

// CompanyProfile/CompanyDisplayStyle/interests editing - the DB home for the
// rich per-company content that used to live in src/edition/. Edited
// together from the admin company content form, but persisted through
// separate 1:1/m:n tables (see schema.prisma), so each gets its own upsert.

export async function updateCompanyProfileForAdmin(
  companyId: string,
  input: {
    bodyText: string;
    videoTitle?: string | null;
    videoHref?: string | null;
    socialLinks?: Record<string, string | undefined>;
    facts?: { iconName: string; description: string; className?: string }[];
  }
) {
  if (!(await findCompanyById(companyId)))
    throw new HttpError("Not found", 404);

  if (!input.bodyText) {
    await deleteCompanyProfile(companyId);
    return;
  }

  const socialLinks = input.socialLinks
    ? Object.fromEntries(
        Object.entries(input.socialLinks).filter(([, value]) => value)
      )
    : undefined;

  await upsertCompanyProfile(companyId, {
    bodyText: input.bodyText,
    videoTitle: input.videoTitle ?? null,
    videoHref: input.videoHref ?? null,
    socialLinks:
      socialLinks && Object.keys(socialLinks).length > 0
        ? socialLinks
        : Prisma.JsonNull,
    facts:
      input.facts && input.facts.length > 0 ? input.facts : Prisma.JsonNull,
  });
}

export async function updateCompanyDisplayStyleForAdmin(
  companyId: string,
  input: {
    logoWidth?: number | null;
    logoHeight?: number | null;
    className?: string | null;
  }
) {
  if (!(await findCompanyById(companyId)))
    throw new HttpError("Not found", 404);
  await upsertCompanyDisplayStyle(companyId, input);
}

export async function updateCompanyInterestsForAdmin(
  companyId: string,
  interestIds: string[]
) {
  if (!(await findCompanyById(companyId)))
    throw new HttpError("Not found", 404);
  await setCompanyInterests(companyId, interestIds);
}
