import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminActionDto } from "@/application/dto/actionDto";
import {
  createActionForAdmin,
  listActionsForAdmin,
} from "@/application/services/actionService";
import { createAdminActionSchema } from "@/schemas/adminActionSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listActionsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminActionDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminActionSchema,
  handler: async ({ body }) => {
    const action = await createActionForAdmin(body);
    return NextResponse.json(toAdminActionDto(action), { status: 201 });
  },
});
