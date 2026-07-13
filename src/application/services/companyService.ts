import "server-only";

import type { Tier } from "@prisma/client";

import { HttpError } from "@/types/HttpError";

import { rankInterestMatchingCompanies } from "../domain/companyMatching";
import {
  createCompany,
  findCompanies,
  findCompaniesWithUsers,
  findCompanyById,
  findCompanyByName,
  findCompanyInterests,
  findInterestMatchingCompanies,
  updateCompanyAvatar,
} from "../repositories/companyRepository";
import {
  findInterestsForCompany,
  findUserInterests,
} from "../repositories/interestRepository";

export const getCompanies = () => findCompanies();
export const getCompaniesWithUsers = () => findCompaniesWithUsers();
export const getCompany = (id: string) => findCompanyById(id);
export const getCompanyInterests = (id: string) => findCompanyInterests(id);

export async function registerCompany(input: {
  userId: string;
  name: string;
  tier: Tier;
  avatarUrl?: string;
}) {
  if (await findCompanyById(input.userId))
    throw new HttpError("Company already exists", 401);
  const company = await createCompany({
    id: input.userId,
    name: input.name,
    tier: input.tier,
  });
  await updateCompanyAvatar(company.id, input.avatarUrl ?? null);
  return company;
}

export async function getInterestsByCompanyName(companyName: string) {
  const company = await findCompanyByName(companyName);
  if (!company) throw new Error("Company not found");
  return (await findInterestsForCompany(company.id)).map(({ name }) => name);
}

export async function getInterestMatchingCompanies(userId: string) {
  const [companies, userInterests] = await Promise.all([
    findInterestMatchingCompanies(),
    findUserInterests(userId),
  ]);
  return rankInterestMatchingCompanies(companies, userInterests);
}
