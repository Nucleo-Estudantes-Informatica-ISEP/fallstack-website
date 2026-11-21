import { NextResponse } from "next/server";

import config from "@/config";
import { serverEnv } from "@/config/env.server";
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
    const logoutUrl = await getLogoutUrl({
      idTokenHint: claims?.idToken,
      loginName: claims?.loginName,
    }).catch(() => serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI);
    const response = NextResponse.json(
      { logoutUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.delete(config.cookies.auth.name);
    return response;
  },
});
