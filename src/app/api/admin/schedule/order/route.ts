import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateScheduleOrder } from "@/application/services/scheduleService";
import { updateScheduleOrderSchema } from "@/schemas/adminScheduleSchema";

export const PATCH = defineHandler({
  auth: "admin",
  schema: updateScheduleOrderSchema,
  handler: async ({ body }) => {
    await updateScheduleOrder(body.updates);
    return NextResponse.json({ message: "Schedule order updated" });
  },
});
