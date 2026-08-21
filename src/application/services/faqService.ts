import "server-only";

import { HttpError } from "@/types/HttpError";
import type { TranslationValues } from "@/domain/i18n/translations";

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

const faqConflict = () =>
  new HttpError(
    "Outro administrador já utilizou esta posição. Atualize e tente novamente.",
    409
  );

export async function listFaqEntriesForAdmin(query: AdminFaqQuery) {
  const [items, totalCount] = await Promise.all([
    findFaqEntriesForAdmin(query),
    countFaqEntriesForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createFaqEntryForAdmin(input: {
  question: TranslationValues;
  answer: TranslationValues;
  order?: number;
}) {
  try {
    return await withTransaction(async (tx) => {
      const order = input.order ?? (await findMaxFaqOrder(tx)) + 1;
      return createFaqEntry({ ...input, order }, tx);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw faqConflict();
    throw error;
  }
}

export async function updateFaqEntryForAdmin(
  id: string,
  input: {
    question?: TranslationValues;
    answer?: TranslationValues;
    order?: number;
  }
) {
  if (!(await findFaqEntryById(id))) throw new HttpError("Not found", 404);
  try {
    return await updateFaqEntry(id, input);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw faqConflict();
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

  // A deferred unique constraint permits swaps in this transaction but
  // converts a stale concurrent reorder into a visible retry response.
  try {
    await bulkUpdateFaqOrder(updates);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw faqConflict();
    throw error;
  }
}
