import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  bulkUpdateFaqOrder,
  countFaqEntriesForAdmin,
  createFaqEntry,
  deleteFaqEntry,
  findAllFaqEntries,
  findFaqEntriesForAdmin,
  findFaqEntryById,
  updateFaqEntry,
  type AdminFaqQuery,
} from "../repositories/faqRepository";

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
  return createFaqEntry(input);
}

export async function updateFaqEntryForAdmin(
  id: string,
  input: { question?: string; answer?: string; order?: number }
) {
  if (!(await findFaqEntryById(id))) throw new HttpError("Not found", 404);
  return updateFaqEntry(id, input);
}

export async function deleteFaqEntryForAdmin(id: string) {
  if (!(await findFaqEntryById(id))) throw new HttpError("Not found", 404);
  await deleteFaqEntry(id);
}

export async function updateFaqOrder(updates: { id: string; order: number }[]) {
  if (updates.length === 0) return;
  await bulkUpdateFaqOrder(updates);
}
