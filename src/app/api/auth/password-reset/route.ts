import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";

export const POST = defineHandler({
  auth: "public",
  handler: async () =>
    NextResponse.json(
      {
        error:
          "Passwords are managed by AuthNEI. Continue with AuthNEI to recover your account.",
        loginUrl: "/api/auth/login",
      },
      { status: 410 }
    ),
});
