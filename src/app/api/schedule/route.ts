import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { getScheduleEvents } from "@/application/services/scheduleService";
import { resolveLanguage } from "@/domain/i18n/translations";

export const GET = defineHandler({
  auth: "public",
  handler: async ({ req }) => {
    const events = await getScheduleEvents();
    const language = resolveLanguage(
      req.nextUrl.searchParams.get("lang") ?? req.headers.get("accept-language")
    );
    return NextResponse.json(
      events.map((event) => toScheduleEventDto(event, language))
    );
  },
});
