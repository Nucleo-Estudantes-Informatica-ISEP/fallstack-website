import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getSessionCheckInCount } from "@/application/services/sessionCheckInService";

interface SessionParams {
  sessionId: string;
}

// Polled by the scanner page; deliberately outside the check-in rate limit
// so reading the count never consumes scan attempts.
export const GET = defineHandler<SessionParams>({
  auth: "staff",
  handler: async ({ params }) => {
    const count = await getSessionCheckInCount(params.sessionId);
    return NextResponse.json({ count });
  },
});
