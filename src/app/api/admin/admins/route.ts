import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminAccountDto } from "@/application/dto/adminAccountDto";
import {
  createAdminAccount,
  listAdminsForAdmin,
} from "@/application/services/adminAccountService";
import { createAdminAccountSchema } from "@/schemas/adminAccountSchema";

export const GET = defineHandler({
  auth: "superadmin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listAdminsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminAccountDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "superadmin",
  schema: createAdminAccountSchema,
  handler: async ({ body }) => {
    const admin = await createAdminAccount(body);
    return NextResponse.json(toAdminAccountDto(admin), { status: 201 });
  },
});
