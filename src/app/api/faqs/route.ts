import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toFaqDto } from "@/application/dto/faqDto";
import { getFaqEntries } from "@/application/services/faqService";

export const GET = defineHandler({
  auth: "public",
  handler: async () => {
    const faqs = await getFaqEntries();
    return NextResponse.json(faqs.map(toFaqDto));
  },
});
