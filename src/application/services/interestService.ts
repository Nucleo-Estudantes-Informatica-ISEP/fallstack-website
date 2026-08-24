import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  countInterestsForAdmin,
  createInterest,
  deleteInterest,
  findInterestById,
  findInterests,
  findInterestsForAdmin,
  updateInterestName,
  type AdminInterestQuery,
} from "../repositories/interestRepository";

export const getInterests = () => findInterests();
export const getInterest = (id: string) => findInterestById(id);

export async function listInterestsForAdmin(query: AdminInterestQuery) {
  const [items, totalCount] = await Promise.all([
    findInterestsForAdmin(query),
    countInterestsForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createInterestForAdmin(name: string) {
  return createInterest(name);
}

export async function updateInterestForAdmin(id: string, name: string) {
  if (!(await findInterestById(id))) throw new HttpError("Not found", 404);
  return updateInterestName(id, name);
}

export async function deleteInterestForAdmin(id: string) {
  if (!(await findInterestById(id))) throw new HttpError("Not found", 404);
  await deleteInterest(id);
}
