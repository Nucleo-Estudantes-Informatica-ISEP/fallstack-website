import { NextRequest, NextResponse } from "next/server";

import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { APP_SESSION_TTL_SECONDS } from "@/config/sessionLifetime";
import { reportError } from "@/lib/logger";
import { consumeOidcRestart } from "@/application/repositories/oidcRestartRepository";
import { completeZitadelSignIn } from "@/application/services/authApplicationService";
import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
  oidcRestartCookieName,
  signAppSession,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";
import { parseOidcRestartMarker } from "@/domain/auth/oidcRestartMarker";
import { sanitizeNext } from "@/domain/auth/sanitizeNext";
import type { SignInFailure } from "@/domain/auth/signInFailure";
import { resolveLanguage } from "@/domain/i18n/translations";
import { uiText } from "@/domain/i18n/ui";

function appUrl(path: string) {
  return new URL(path, serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI);
}

function clearOidcCookies(response: NextResponse) {
  for (const name of Object.values(oidcCookieNames))
    response.cookies.delete(name);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorCode = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(oidcCookieNames.state)?.value;
  const expectedNonce = request.cookies.get(oidcCookieNames.nonce)?.value;
  const verifier = request.cookies.get(oidcCookieNames.verifier)?.value;
  const current = Boolean(state && state === expectedState);
  const recoveryCookie = oidcRestartCookieName(state);
  const recoveryValue = recoveryCookie
    ? request.cookies.get(recoveryCookie)?.value
    : undefined;
  const token = parseOidcRestartMarker(recoveryValue)?.token;
  let storedDestination: string | undefined;
  if (token) {
    try {
      storedDestination = await consumeOidcRestart(token);
    } catch (error) {
      reportError(
        error,
        { operation: "oidc_restart_consume" },
        "Could not read the sign-in destination"
      );
      // Leave the callback and its cookies intact so the browser can retry.
      const language = resolveLanguage(request.headers.get("accept-language"));
      const message = uiText(
        language,
        "O início de sessão está temporariamente indisponível."
      );
      const retry = uiText(language, "Tentar novamente");
      return new NextResponse(
        `<!doctype html><html lang="${language.toLowerCase()}"><meta charset="utf-8"><title>FallStack</title><p>${message}</p><a href="">${retry}</a></html>`,
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Retry-After": "5",
          },
        }
      );
    }
  }
  const appDestination = sanitizeNext(
    current
      ? storedDestination ||
          request.cookies.get(oidcCookieNames.next)?.value ||
          null
      : null
  );
  const restartDestination = sanitizeNext(
    (token ? storedDestination : recoveryValue) || appDestination
  );

  function finish(response: NextResponse) {
    if (current) clearOidcCookies(response);
    if (recoveryCookie)
      response.cookies.set(recoveryCookie, "", {
        path: "/api/auth",
        maxAge: 0,
      });
    return response;
  }

  function authFailure(failure: SignInFailure) {
    const path = appUrl("/login");
    path.searchParams.set("error", failure);
    if (restartDestination !== "/")
      path.searchParams.set("next", restartDestination);
    return finish(NextResponse.redirect(path));
  }

  if (state && (code || errorCode) && (!current || !expectedNonce || !verifier))
    return authFailure("auth-expired");
  if (!current) return authFailure("auth-code-error");
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
      fallback: appDestination,
    });
    const response = NextResponse.redirect(appUrl(destination));

    response.cookies.set(config.cookies.auth.name, signAppSession(identity), {
      httpOnly: true,
      secure: serverEnv.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_SESSION_TTL_SECONDS,
    });
    return finish(response);
  } catch (error) {
    if (error instanceof AuthNeiEmailVerificationRequired) {
      const response = authFailure("auth-verification-required");
      if (error.loginHint && error.loginHint.length <= 320) {
        response.cookies.set(
          verifyEmailCookieName,
          JSON.stringify({
            loginHint: error.loginHint,
          }),
          {
            httpOnly: true,
            secure: serverEnv.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 300,
          }
        );
      }
      return response;
    }
    reportError(
      error,
      { operation: "zitadel_oidc_callback" },
      "Failed to complete direct AuthNEI sign-in"
    );
    return authFailure("auth-code-error");
  }
}
