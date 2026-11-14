import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { checkRateLimit } from "@/application/services/rateLimitService";
import { recordSessionCheckIn } from "@/application/services/sessionCheckInService";
import {
  sessionCheckInSchema,
  type SessionCheckInInput,
} from "@/schemas/sessionCheckInSchema";

interface SessionParams {
  sessionId: string;
}

export const POST = defineHandler<SessionParams, typeof sessionCheckInSchema>({
  auth: "staff",
  schema: sessionCheckInSchema,
  handler: async ({ params, session, body }) => {
    const blocked = rateLimitResponse(
      await checkRateLimit("session_check_in", session!.id, {
        max: 60,
        windowMs: 60_000,
      })
    );
    if (blocked) return blocked;
    const checkIn = await recordSessionCheckIn(
      params.sessionId,
      session!.id,
      body as SessionCheckInInput
    );
    return NextResponse.json(checkIn, { status: 201 });
  },
});
