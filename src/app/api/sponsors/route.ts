import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toSponsorDto } from "@/application/dto/sponsorDto";
import { getActiveSponsors } from "@/application/services/sponsorService";

export const GET = defineHandler({
  auth: "public",
  handler: async () => {
    const sponsors = await getActiveSponsors();
    return NextResponse.json(sponsors.map(toSponsorDto));
  },
});
