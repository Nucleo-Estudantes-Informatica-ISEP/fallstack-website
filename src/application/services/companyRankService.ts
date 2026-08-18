import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  bulkUpdateCompanyRankOrder,
  countCompaniesForRank,
  countCompanyRanksForAdmin,
  createCompanyRank,
  deleteCompanyRank,
  findAllCompanyRanks,
  findCompanyRankById,
  findCompanyRanksByIds,
  findCompanyRanksForAdmin,
  findMaxCompanyRankOrder,
  isUniqueConstraintError,
  updateCompanyRank,
  type AdminCompanyRankQuery,
  type CompanyRankStyleInput,
} from "../repositories/companyRankRepository";
import { withTransaction } from "../repositories/transaction";

export const getCompanyRanks = () => findAllCompanyRanks();
export const getCompanyRank = (id: string) => findCompanyRankById(id);

export async function listCompanyRanksForAdmin(query: AdminCompanyRankQuery) {
  const [items, totalCount] = await Promise.all([
    findCompanyRanksForAdmin(query),
    countCompanyRanksForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createCompanyRankForAdmin(input: {
  name: string;
  order?: number;
  style: CompanyRankStyleInput;
}) {
  try {
    return await withTransaction(async (tx) => {
      const order = input.order ?? (await findMaxCompanyRankOrder(tx)) + 1;
      return createCompanyRank({ ...input, order }, tx);
    });
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Já existe um rank com este nome.", 409);
    throw error;
  }
}

export async function updateCompanyRankForAdmin(
  id: string,
  input: {
    name?: string;
    order?: number;
    style?: Partial<CompanyRankStyleInput>;
  }
) {
  if (!(await findCompanyRankById(id))) throw new HttpError("Not found", 404);
  try {
    return await updateCompanyRank(id, input);
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Já existe um rank com este nome.", 409);
    throw error;
  }
}

export async function deleteCompanyRankForAdmin(id: string) {
  if (!(await findCompanyRankById(id))) throw new HttpError("Not found", 404);
  const companiesCount = await countCompaniesForRank(id);
  if (companiesCount > 0)
    throw new HttpError(
      "Não é possível eliminar um rank com empresas associadas.",
      409
    );
  await deleteCompanyRank(id);
}

export async function updateCompanyRankOrder(
  updates: { id: string; order: number }[]
) {
  if (updates.length === 0) return;

  const existing = await findCompanyRanksByIds(updates.map((u) => u.id));
  const existingIds = new Set(existing.map((rank) => rank.id));
  for (const update of updates) {
    if (!existingIds.has(update.id)) throw new HttpError("Not found", 404);
  }

  await bulkUpdateCompanyRankOrder(updates);
}
