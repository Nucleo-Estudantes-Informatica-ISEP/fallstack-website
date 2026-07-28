import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import {
  createScheduleEventForAdmin,
  listScheduleEventsForAdmin,
} from "@/application/services/scheduleService";
import { createAdminScheduleSchema } from "@/schemas/adminScheduleSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listScheduleEventsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toScheduleEventDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminScheduleSchema,
  handler: async ({ body }) => {
    const event = await createScheduleEventForAdmin(body);
    return NextResponse.json(toScheduleEventDto(event), { status: 201 });
  },
});
