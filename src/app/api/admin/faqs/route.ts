import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminFaqDto } from "@/application/dto/faqDto";
import {
  createFaqEntryForAdmin,
  listFaqEntriesForAdmin,
} from "@/application/services/faqService";
import { createAdminFaqSchema } from "@/schemas/adminFaqSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listFaqEntriesForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminFaqDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminFaqSchema,
  handler: async ({ body }) => {
    const faq = await createFaqEntryForAdmin(body);
    return NextResponse.json(toAdminFaqDto(faq), { status: 201 });
  },
});
