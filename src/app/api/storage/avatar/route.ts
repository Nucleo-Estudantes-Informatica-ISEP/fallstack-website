import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { tooManyRequestsResponse } from "@/lib/rateLimit";
import { createUploadTicket } from "@/application/services/uploadTicketService";
import { storageUploadTicketSchema } from "@/schemas/storageUploadTicketSchema";

export const POST = defineHandler<
  Record<string, never>,
  typeof storageUploadTicketSchema
>({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  schema: storageUploadTicketSchema,
  handler: async ({ session, body }) => {
    const result = await createUploadTicket("avatar", session!.id, body);
    if (!result.allowed) return tooManyRequestsResponse(result.retryAfterMs);
    return NextResponse.json(result.ticket, { status: 201 });
  },
});
