import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import {
  createAuthorizationRequest,
  oidcCookieNames,
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
  return response;
}
