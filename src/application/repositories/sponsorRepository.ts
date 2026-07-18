import "server-only";

import prisma from "./database";

export const findActiveSponsors = () =>
  prisma.sponsor.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, logo: true, website: true, order: true },
  });

export const findAllSponsorsForAdmin = () =>
  prisma.sponsor.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

export const findSponsorById = (id: string) =>
  prisma.sponsor.findUnique({ where: { id } });

export const createSponsor = (data: {
  name: string;
  logo: string;
  website?: string | null;
  active?: boolean;
  order?: number;
}) => prisma.sponsor.create({ data });

export const updateSponsor = (
  id: string,
  data: {
    name?: string;
    logo?: string;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) => prisma.sponsor.update({ where: { id }, data });
