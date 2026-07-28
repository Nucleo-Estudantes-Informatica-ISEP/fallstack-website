import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import {
  createSponsorForAdmin,
  listSponsorsForAdmin,
} from "@/application/services/sponsorService";
import { createAdminSponsorSchema } from "@/schemas/adminSponsorSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async () => {
    const sponsors = await listSponsorsForAdmin();
    return NextResponse.json(sponsors.map(toAdminSponsorDto));
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminSponsorSchema,
  handler: async ({ body }) => {
    const sponsor = await createSponsorForAdmin(body);
    return NextResponse.json(toAdminSponsorDto(sponsor), { status: 201 });
  },
});
