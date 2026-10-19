import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getPublicFaqs } from "@/application/services/publicEditionService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

export const GET = defineHandler({
  auth: "none",
  handler: async ({ req }) => {
    const language = resolveRequestLanguage(
      req.nextUrl.searchParams.get("lang"),
      req.headers.get("accept-language")
    );
    const data = await getPublicFaqs(language);
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  },
});
