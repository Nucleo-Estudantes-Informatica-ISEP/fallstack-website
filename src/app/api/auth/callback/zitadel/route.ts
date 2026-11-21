import { NextRequest, NextResponse } from "next/server";

import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { APP_SESSION_TTL_SECONDS } from "@/config/sessionLifetime";
import { reportError } from "@/lib/logger";
import { completeZitadelSignIn } from "@/application/services/authApplicationService";
import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
  signAppSession,
} from "@/application/services/zitadelAuthService";
import type { SignInFailure } from "@/domain/auth/signInFailure";

function appUrl(path: string) {
  return new URL(path, serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI);
}

function clearOidcCookies(response: NextResponse) {
  for (const name of Object.values(oidcCookieNames))
    response.cookies.delete(name);
}

function authFailure(failure: SignInFailure) {
  const response = NextResponse.redirect(appUrl(`/login?error=${failure}`));
  clearOidcCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorCode = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(oidcCookieNames.state)?.value;
  const expectedNonce = request.cookies.get(oidcCookieNames.nonce)?.value;
  const verifier = request.cookies.get(oidcCookieNames.verifier)?.value;
  const next = request.cookies.get(oidcCookieNames.next)?.value ?? "/";

  if (
    state &&
    (code || errorCode) &&
    (!expectedState || state !== expectedState || !expectedNonce || !verifier)
  )
    return authFailure("auth-expired");
  if (!state || state !== expectedState) return authFailure("auth-code-error");
  if (errorCode === "access_denied") return authFailure("auth-cancelled");
  if (!code || errorCode || !expectedNonce || !verifier)
    return authFailure("auth-code-error");

  try {
    const identity = await completeAuthorizationCode({
      code,
      verifier,
      expectedNonce,
    });
    const destination = await completeZitadelSignIn({
      identity,
      fallback: next,
    });
    const response = NextResponse.redirect(appUrl(destination));

    response.cookies.set(config.cookies.auth.name, signAppSession(identity), {
      httpOnly: true,
      secure: serverEnv.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_SESSION_TTL_SECONDS,
    });
    clearOidcCookies(response);
    return response;
  } catch (error) {
    if (error instanceof AuthNeiEmailVerificationRequired)
      return authFailure("auth-verification-required");
    reportError(
      error,
      { operation: "zitadel_oidc_callback" },
      "Failed to complete direct AuthNEI sign-in"
    );
    return authFailure("auth-code-error");
  }
}
