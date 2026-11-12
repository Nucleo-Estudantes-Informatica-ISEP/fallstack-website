import { NextResponse } from "next/server";

import config from "@/config";
import { defineHandler } from "@/lib/http/server";
import {
  getLogoutUrl,
  verifyAppSession,
} from "@/application/services/zitadelAuthService";

export const POST = defineHandler({
  auth: "public",
  handler: async ({ req }) => {
    const token = req.cookies.get(config.cookies.auth.name)?.value;
    const claims = token ? verifyAppSession(token) : null;
    const response = NextResponse.json(
      { logoutUrl: await getLogoutUrl(claims?.loginName) },
      { status: 200 }
    );
    response.cookies.delete(config.cookies.auth.name);
    return response;
  },
});
