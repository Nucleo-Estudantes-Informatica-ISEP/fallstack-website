import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getInterests } from "@/application/services/interestService";

export const GET = defineHandler({
  auth: "public",
  handler: async () => {
    const interests = await getInterests();
    return NextResponse.json(interests);
  },
});
