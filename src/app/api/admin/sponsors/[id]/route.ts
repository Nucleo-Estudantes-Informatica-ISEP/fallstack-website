import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import { updateSponsorForAdmin } from "@/application/services/sponsorService";
import { updateAdminSponsorSchema } from "@/schemas/adminSponsorSchema";

interface SponsorParams {
  id: string;
}

export const PATCH = defineHandler<
  SponsorParams,
  typeof updateAdminSponsorSchema
>({
  auth: "admin",
  schema: updateAdminSponsorSchema,
  handler: async ({ params, body }) => {
    const sponsor = await updateSponsorForAdmin(params.id, body);
    return NextResponse.json(toAdminSponsorDto(sponsor));
  },
});
