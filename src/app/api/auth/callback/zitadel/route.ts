import { NextRequest, NextResponse } from "next/server";

import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { reportError } from "@/lib/logger";
import { completeZitadelSignIn } from "@/application/services/authApplicationService";
import {
  completeAuthorizationCode,
  oidcCookieNames,
  signAppSession,
} from "@/application/services/zitadelAuthService";

function appUrl(path: string) {
  return new URL(path, serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI);
}

function clearOidcCookies(response: NextResponse) {
  for (const name of Object.values(oidcCookieNames)) response.cookies.delete(name);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(oidcCookieNames.state)?.value;
  const expectedNonce = request.cookies.get(oidcCookieNames.nonce)?.value;
  const verifier = request.cookies.get(oidcCookieNames.verifier)?.value;
  const next = request.cookies.get(oidcCookieNames.next)?.value ?? "/";

  if (!code || !state || !expectedState || state !== expectedState || !expectedNonce || !verifier) {
    const response = NextResponse.redirect(appUrl("/auth/auth-code-error"));
    clearOidcCookies(response);
    return response;
  }

  try {
    const identity = await completeAuthorizationCode({
      code,
      verifier,
      expectedNonce,
    });
    const destination = await completeZitadelSignIn({ identity, fallback: next });
    const response = NextResponse.redirect(appUrl(destination));

    response.cookies.set(config.cookies.auth.name, signAppSession(identity), {
      httpOnly: true,
      secure: serverEnv.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    clearOidcCookies(response);
    return response;
  } catch (error) {
    reportError(
      error,
      { operation: "zitadel_oidc_callback" },
      "Failed to complete direct AuthNEI sign-in"
    );
    const response = NextResponse.redirect(appUrl("/auth/auth-code-error"));
    clearOidcCookies(response);
    return response;
  }
}
