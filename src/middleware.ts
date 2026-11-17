import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isStagingEnvironment } from "@/lib/seo";
import { buildCsp } from "@/security/csp";
import {
  INSTANCE_ID_HEADER,
  instanceId,
  needsCsp,
} from "@/security/instanceId";

export function middleware(request: NextRequest) {
  const isStaging = isStagingEnvironment({
    headers: request.headers,
    hostname: request.nextUrl.hostname,
  });

  const requestHeaders = new Headers(request.headers);
  const language = request.cookies.get("fallstack-language")?.value;
  if (language === "pt" || language === "en") {
    requestHeaders.set("accept-language", language);
  }

  if (!needsCsp(request.nextUrl.pathname, request.headers)) {
    const passThrough = NextResponse.next({
      request: { headers: requestHeaders },
    });
    passThrough.headers.set(INSTANCE_ID_HEADER, instanceId);
    if (isStaging) {
      passThrough.headers.set(
        "X-Robots-Tag",
        "noindex, nofollow, noarchive"
      );
    }
    return passThrough;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp({ nonce, isDev });

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(INSTANCE_ID_HEADER, instanceId);
  if (isStaging) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive"
    );
  }

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
