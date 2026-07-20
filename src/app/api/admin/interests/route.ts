import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminInterestDto } from "@/application/dto/interestDto";
import {
  createInterestForAdmin,
  listInterestsForAdmin,
} from "@/application/services/interestService";
import { createAdminInterestSchema } from "@/schemas/adminInterestSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listInterestsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminInterestDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminInterestSchema,
  handler: async ({ body }) => {
    const interest = await createInterestForAdmin(body.name);
    return NextResponse.json(interest, { status: 201 });
  },
});
