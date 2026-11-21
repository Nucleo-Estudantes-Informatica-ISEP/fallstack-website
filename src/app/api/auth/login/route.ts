import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import {
  createAuthorizationRequest,
  oidcCookieNames,
  oidcRestartCookieName,
  oidcRestartCookiePrefix,
} from "@/application/services/zitadelAuthService";

export async function GET(request: NextRequest) {
  const auth = await createAuthorizationRequest(
    request.nextUrl.searchParams.get("next")
  );
  const response = NextResponse.redirect(auth.url);
  const cookieOptions = {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: auth.maxAge,
  };

  response.cookies.set(oidcCookieNames.state, auth.state, cookieOptions);
  response.cookies.set(oidcCookieNames.nonce, auth.nonce, cookieOptions);
  response.cookies.set(oidcCookieNames.verifier, auth.verifier, cookieOptions);
  response.cookies.set(oidcCookieNames.next, auth.next, cookieOptions);
  const recoveryCookie = oidcRestartCookieName(auth.state);
  if (
    recoveryCookie &&
    auth.next !== "/" &&
    encodeURIComponent(auth.next).length <= 1024
  ) {
    const recoveryOptions = {
      ...cookieOptions,
      path: "/api/auth",
      maxAge: 30 * 60,
    };
    const existingRecoveryCookies = request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith(oidcRestartCookiePrefix));
    for (const { name } of existingRecoveryCookies.slice(0, -3)) {
      response.cookies.set(name, "", { ...recoveryOptions, maxAge: 0 });
    }
    response.cookies.set(recoveryCookie, auth.next, recoveryOptions);
  }
  return response;
}
