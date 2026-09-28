import "server-only";

import { HttpError } from "@/types/HttpError";
import { logoSchema } from "@/schemas/logoSchema";

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
  const sponsor = await findSponsorById(id);
  if (!sponsor) throw new HttpError("Not found", 404);
  if (input.active && !logoSchema.safeParse(input.logo ?? sponsor.logo).success)
    throw new HttpError("Upload a valid logo before activation", 400);
  return updateSponsor(id, input);
}
