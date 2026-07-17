import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  createSponsor,
  findActiveSponsors,
  findAllSponsorsForAdmin,
  findSponsorById,
  updateSponsor,
} from "../repositories/sponsorRepository";

export const getActiveSponsors = () => findActiveSponsors();
export const listSponsorsForAdmin = () => findAllSponsorsForAdmin();

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
