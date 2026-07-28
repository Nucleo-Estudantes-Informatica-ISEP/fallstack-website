import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { getScheduleEvents } from "@/application/services/scheduleService";

export const GET = defineHandler({
  auth: "public",
  handler: async () => {
    const events = await getScheduleEvents();
    return NextResponse.json(events.map(toScheduleEventDto));
  },
});
