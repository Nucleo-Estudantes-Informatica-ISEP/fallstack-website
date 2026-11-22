import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import { reportError } from "@/lib/logger";
import { saveOidcRestart } from "@/application/repositories/oidcRestartRepository";
import {
  createAuthorizationRequest,
  oidcCookieNames,
  oidcRestartCookieName,
  oidcRestartCookiePrefix,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";
import { parseOidcRestartMarker } from "@/domain/auth/oidcRestartMarker";

export async function GET(request: NextRequest) {
  const registration = request.nextUrl.searchParams.get("register") === "1";
  if (registration && serverEnv.EVENT_MODE === "offseason") {
    return NextResponse.redirect(new URL("/signup", request.url));
  }
  let next = request.nextUrl.searchParams.get("next");
  let loginHint: string | undefined;
  const raw = request.cookies.get(verifyEmailCookieName)?.value;
  if (!registration && raw && request.nextUrl.searchParams.get("verifyEmail") === "1") {
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
  const auth = registration
    ? await createAuthorizationRequest("/signup", undefined, "create")
    : await createAuthorizationRequest(next, loginHint);
  const storedDestination = auth.next !== "/";
  const token = storedDestination
    ? randomBytes(32).toString("base64url")
    : undefined;
  if (token) {
    try {
      await saveOidcRestart(token, auth.next);
    } catch (error) {
      reportError(
        error,
        { operation: "oidc_restart_save" },
        "Could not store the sign-in destination"
      );
      const retry = new URL("/login", request.url);
      retry.searchParams.set(
        "error",
        loginHint ? "auth-verification-required" : "auth-code-error"
      );
      retry.searchParams.set("next", auth.next);
      return NextResponse.redirect(retry);
    }
  }
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
  response.cookies.set(
    oidcCookieNames.next,
    storedDestination ? "/" : auth.next,
    cookieOptions
  );
  const recoveryCookie = oidcRestartCookieName(auth.state);
  if (recoveryCookie && token) {
    const recoveryOptions = {
      ...cookieOptions,
      path: "/api/auth",
      maxAge: 30 * 60,
    };
    const existingRecoveryCookies = request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith(oidcRestartCookiePrefix))
      .map(({ name, value }) => ({
        name,
        issuedAt: parseOidcRestartMarker(value)?.issuedAt ?? 0,
      }))
      .sort((a, b) => a.issuedAt - b.issuedAt);
    for (const { name } of existingRecoveryCookies.slice(0, -3)) {
      response.cookies.set(name, "", { ...recoveryOptions, maxAge: 0 });
    }
    response.cookies.set(
      recoveryCookie,
      `stored:${Date.now()}:${token}`,
      recoveryOptions
    );
  }
  return response;
}
