import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminCompanyRankDto } from "@/application/dto/companyRankDto";
import {
  createCompanyRankForAdmin,
  listCompanyRanksForAdmin,
} from "@/application/services/companyRankService";
import { createAdminCompanyRankSchema } from "@/schemas/companyRankSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listCompanyRanksForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminCompanyRankDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminCompanyRankSchema,
  handler: async ({ body }) => {
    const rank = await createCompanyRankForAdmin(body);
    return NextResponse.json(toAdminCompanyRankDto(rank), { status: 201 });
  },
});
