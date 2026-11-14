import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
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
    const checkIn = await recordSessionCheckIn(
      params.sessionId,
      session!.id,
      body as SessionCheckInInput
    );
    return NextResponse.json(checkIn, { status: 201 });
  },
});
