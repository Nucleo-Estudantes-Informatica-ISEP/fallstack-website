import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getPublicSponsors } from "@/application/services/publicEditionService";

export const GET = defineHandler({
  auth: "none",
  handler: async () => {
    const data = await getPublicSponsors();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  },
});
