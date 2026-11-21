import { NextResponse } from "next/server";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { defineHandler } from "@/lib/http/server";
import {
  getLogoutUrl,
  verifyAppSession,
} from "@/application/services/zitadelAuthService";

export const POST = defineHandler({
  auth: "none",
  handler: async ({ req }) => {
    const scope = req.nextUrl.searchParams.get("scope");
    if (scope !== null && scope !== "app" && scope !== "shared") {
      throw new HttpError("Unknown sign-out scope", 400);
    }

    let logoutUrl = "/";
    if (scope !== "app") {
      const token = req.cookies.get(config.cookies.auth.name)?.value;
      const claims = token ? verifyAppSession(token) : null;
      logoutUrl = await getLogoutUrl({
        idTokenHint: claims?.idToken,
        loginName: claims?.loginName,
      }).catch(() => serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI);
      if (
        scope === "shared" &&
        logoutUrl === serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI
      ) {
        throw new HttpError("AuthNEI sign-out unavailable", 503);
      }
    }

    const response = NextResponse.json(
      { logoutUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.delete(config.cookies.auth.name);
    return response;
  },
});
