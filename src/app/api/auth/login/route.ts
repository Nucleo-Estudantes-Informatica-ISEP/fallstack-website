import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import {
  createAuthorizationRequest,
  oidcCookieNames,
  oidcRestartCookieName,
  oidcRestartCookiePrefix,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";

export async function GET(request: NextRequest) {
  let next = request.nextUrl.searchParams.get("next");
  let loginHint: string | undefined;
  const raw = request.cookies.get(verifyEmailCookieName)?.value;
  if (raw && request.nextUrl.searchParams.get("verifyEmail") === "1") {
    try {
      const recovery = JSON.parse(raw) as {
        loginHint?: unknown;
        next?: unknown;
      };
      if (
        typeof recovery?.loginHint === "string" &&
        recovery.loginHint.length <= 320
      ) {
        loginHint = recovery.loginHint;
        if (typeof recovery.next === "string") next = recovery.next;
      }
    } catch {
      // A missing or invalid recovery cookie still allows a normal sign-in.
    }
  }
  const auth = await createAuthorizationRequest(next, loginHint);
  const response = NextResponse.redirect(auth.url);
  const cookieOptions = {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: auth.maxAge,
  };

  if (raw) response.cookies.delete(verifyEmailCookieName);
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
