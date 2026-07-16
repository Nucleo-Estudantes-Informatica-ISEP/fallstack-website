import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { signJwt } from "@/services/authService";

export const GET = defineHandler({
  auth: "student",
  handler: async ({ session }) => {
    const data = signJwt(
      { code: session!.student!.code },
      { expiresIn: 30 * 60 }
    );
    return NextResponse.json({ data });
  },
});
