import "server-only";

import { HttpError } from "@/types/HttpError";
import type { TranslationValues } from "@/domain/i18n/translations";

import {
  countInterestUsers,
  createInterest,
  deleteInterest,
  findInterestById,
  findInterests,
  findInterestsForAdmin,
  isUniqueInterestNameError,
  updateInterestName,
  type AdminInterestQuery,
} from "../repositories/interestRepository";

export const getInterests = () => findInterests();
export const getInterest = (id: string) => findInterestById(id);

export async function listInterestsForAdmin(query: AdminInterestQuery) {
  const allItems = await findInterestsForAdmin(query);
  const start = (query.page - 1) * query.pageSize;
  return {
    items: allItems.slice(start, start + query.pageSize),
    totalCount: allItems.length,
  };
}

export async function createInterestForAdmin(name: TranslationValues) {
  try {
    return await createInterest(name);
  } catch (error) {
    if (isUniqueInterestNameError(error))
      throw new HttpError("Já existe um interesse com este nome.", 409);
    throw error;
  }
}

export async function updateInterestForAdmin(
  id: string,
  name: TranslationValues
) {
  if (!(await findInterestById(id))) throw new HttpError("Not found", 404);
  try {
    return await updateInterestName(id, name);
  } catch (error) {
    if (isUniqueInterestNameError(error))
      throw new HttpError("Já existe um interesse com este nome.", 409);
    throw error;
  }
}

export async function deleteInterestForAdmin(id: string) {
  if (!(await findInterestById(id))) throw new HttpError("Not found", 404);
  const usersCount = await countInterestUsers(id);
  if (usersCount > 0)
    throw new HttpError("Não é possível eliminar um interesse em uso.", 409);
  await deleteInterest(id);
}
