import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toSessionDto } from "@/application/dto/sessionDto";

export const GET = defineHandler({
  auth: "public",
  handler: async ({ session }) => {
    if (!session) return new NextResponse(null, { status: 401 });
    return NextResponse.json(toSessionDto(session), { status: 200 });
  },
});
