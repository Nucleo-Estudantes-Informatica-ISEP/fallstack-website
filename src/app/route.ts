import { NextResponse, type NextRequest } from "next/server";

import { resolveRequestLanguage } from "@/domain/i18n/translations";

export function GET(request: NextRequest) {
  const language = resolveRequestLanguage(
    request.nextUrl.searchParams.get("lang"),
    request.headers.get("accept-language")
  );
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/event/${language.toLowerCase()}`,
      "Cache-Control": "private, no-store",
      Vary: "Accept-Language",
    },
  });
}
