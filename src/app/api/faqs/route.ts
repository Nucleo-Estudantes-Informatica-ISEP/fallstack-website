import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toFaqDto } from "@/application/dto/faqDto";
import { getFaqEntries } from "@/application/services/faqService";
import { resolveLanguage } from "@/domain/i18n/translations";

export const GET = defineHandler({
  auth: "public",
  handler: async ({ req }) => {
    const faqs = await getFaqEntries();
    const language = resolveLanguage(
      req.nextUrl.searchParams.get("lang") ?? req.headers.get("accept-language")
    );
    return NextResponse.json(faqs.map((faq) => toFaqDto(faq, language)));
  },
});
