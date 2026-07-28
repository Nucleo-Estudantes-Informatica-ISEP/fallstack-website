import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import {
  createCompanyForAdmin,
  listCompaniesForAdmin,
} from "@/application/services/companyService";
import { createAdminCompanySchema } from "@/schemas/adminCompanySchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listCompaniesForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminCompanyDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminCompanySchema,
  handler: async ({ body }) => {
    const company = await createCompanyForAdmin(body);
    return NextResponse.json(toAdminCompanyDto(company), { status: 201 });
  },
});
