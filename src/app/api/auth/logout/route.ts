import { NextResponse } from "next/server";

import config from "@/config";
import { defineHandler } from "@/lib/http/server";
import { getLogoutUrl } from "@/application/services/zitadelAuthService";

export const POST = defineHandler({
  auth: "public",
  handler: async () => {
    const response = NextResponse.json(
      { logoutUrl: await getLogoutUrl() },
      { status: 200 }
    );
    response.cookies.delete(config.cookies.auth.name);
    return response;
  },
});
