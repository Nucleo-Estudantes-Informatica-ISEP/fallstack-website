import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  bulkUpdateFaqOrder,
  countFaqEntriesForAdmin,
  createFaqEntry,
  deleteFaqEntry,
  findAllFaqEntries,
  findFaqEntriesByIds,
  findFaqEntriesForAdmin,
  findFaqEntryById,
  findMaxFaqOrder,
  isUniqueConstraintError,
  updateFaqEntry,
  type AdminFaqQuery,
} from "../repositories/faqRepository";
import { withTransaction } from "../repositories/transaction";

export const getFaqEntries = () => findAllFaqEntries();
export const getFaqEntry = (id: string) => findFaqEntryById(id);

export async function listFaqEntriesForAdmin(query: AdminFaqQuery) {
  const [items, totalCount] = await Promise.all([
    findFaqEntriesForAdmin(query),
    countFaqEntriesForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createFaqEntryForAdmin(input: {
  question: string;
  answer: string;
  order?: number;
}) {
  try {
    return await withTransaction(async (tx) => {
      const order = input.order ?? (await findMaxFaqOrder(tx)) + 1;
      return createFaqEntry({ ...input, order }, tx);
    });
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Já existe uma pergunta igual.", 409);
    throw error;
  }
}

export async function updateFaqEntryForAdmin(
  id: string,
  input: { question?: string; answer?: string; order?: number }
) {
  if (!(await findFaqEntryById(id))) throw new HttpError("Not found", 404);
  try {
    return await updateFaqEntry(id, input);
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Já existe uma pergunta igual.", 409);
    throw error;
  }
}

export async function deleteFaqEntryForAdmin(id: string) {
  if (!(await findFaqEntryById(id))) throw new HttpError("Not found", 404);
  await deleteFaqEntry(id);
}

export async function updateFaqOrder(updates: { id: string; order: number }[]) {
  if (updates.length === 0) return;

  const existing = await findFaqEntriesByIds(
    updates.map((update) => update.id)
  );
  const existingIds = new Set(existing.map((entry) => entry.id));
  for (const update of updates) {
    if (!existingIds.has(update.id)) throw new HttpError("Not found", 404);
  }

  await bulkUpdateFaqOrder(updates);
}
