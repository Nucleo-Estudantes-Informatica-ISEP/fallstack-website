import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import {
  deleteScheduleEventForAdmin,
  updateScheduleEventForAdmin,
} from "@/application/services/scheduleService";
import { updateAdminScheduleSchema } from "@/schemas/adminScheduleSchema";

interface ScheduleParams {
  id: string;
}

export const PATCH = defineHandler<
  ScheduleParams,
  typeof updateAdminScheduleSchema
>({
  auth: "admin",
  schema: updateAdminScheduleSchema,
  handler: async ({ params, body }) => {
    const event = await updateScheduleEventForAdmin(params.id, body);
    return NextResponse.json(toScheduleEventDto(event));
  },
});

export const DELETE = defineHandler<ScheduleParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteScheduleEventForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
