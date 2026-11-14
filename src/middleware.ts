import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildCsp } from "@/security/csp";
import {
  INSTANCE_ID_HEADER,
  instanceId,
  needsCsp,
} from "@/security/instanceId";

export function middleware(request: NextRequest) {
  if (!needsCsp(request.nextUrl.pathname, request.headers)) {
    const passThrough = NextResponse.next();
    passThrough.headers.set(INSTANCE_ID_HEADER, instanceId);
    return passThrough;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp({ nonce, isDev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(INSTANCE_ID_HEADER, instanceId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static chunks)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset extensions (svg, png, jpg, jpeg, gif, webp, woff, woff2, ttf)
     * - PWA service worker and manifest files (sw.js, workbox-*, manifest.webmanifest)
     *
     * API routes are matched so they carry `x-instance-id`; `needsCsp` keeps
     * the CSP nonce off them and off prefetch requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$).*)",
  ],
};
