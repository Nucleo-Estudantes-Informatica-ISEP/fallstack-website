import "server-only";

import type { Tier } from "@prisma/client";

import { HttpError } from "@/types/HttpError";

import {
  createCompany,
  createCompanyDisplay,
  findActiveCompanies,
  findAllCompaniesForAdmin,
  findCompanies,
  findCompanyById,
  findCompanyByName,
  findCompanyDisplayByName,
  findCompanyInterests,
  updateCompanyAvatar,
  updateCompanyDisplay,
} from "../repositories/companyRepository";
import { findInterestsForCompany } from "../repositories/interestRepository";
import { withTransaction } from "../repositories/transaction";

export const getCompanies = () => findCompanies();
export const getCompany = (id: string) => findCompanyById(id);
export const getCompanyInterests = (id: string) => findCompanyInterests(id);

export const getActiveCompanies = () => findActiveCompanies();
export const getCompanyDisplayByName = (name: string) =>
  findCompanyDisplayByName(name);

export const listCompaniesForAdmin = () => findAllCompaniesForAdmin();

export async function createCompanyForAdmin(input: {
  name: string;
  tier: Tier;
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
    tier?: Tier;
    avatar?: string | null;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) {
  if (!(await findCompanyById(id))) throw new HttpError("Not found", 404);
  return updateCompanyDisplay(id, input);
}

export async function registerCompany(input: {
  userId: string;
  name: string;
  tier: Tier;
  avatarUrl?: string;
}) {
  if (await findCompanyById(input.userId))
    throw new HttpError("Company already exists", 401);
  return withTransaction(async (tx) => {
    const company = await createCompany(
      { id: input.userId, name: input.name, tier: input.tier },
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
