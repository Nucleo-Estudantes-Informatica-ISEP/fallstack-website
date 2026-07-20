import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  countSponsorsForAdmin,
  createSponsor,
  findActiveSponsors,
  findAllSponsorsForAdmin,
  findSponsorById,
  updateSponsor,
  type AdminSponsorQuery,
} from "../repositories/sponsorRepository";

export const getActiveSponsors = () => findActiveSponsors();
export const getSponsor = (id: string) => findSponsorById(id);

export async function listSponsorsForAdmin(query: AdminSponsorQuery) {
  const [items, totalCount] = await Promise.all([
    findAllSponsorsForAdmin(query),
    countSponsorsForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createSponsorForAdmin(input: {
  name: string;
  logo: string;
  website?: string | null;
  active?: boolean;
  order?: number;
}) {
  return createSponsor(input);
}

export async function updateSponsorForAdmin(
  id: string,
  input: {
    name?: string;
    logo?: string;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) {
  if (!(await findSponsorById(id))) throw new HttpError("Not found", 404);
  return updateSponsor(id, input);
}
