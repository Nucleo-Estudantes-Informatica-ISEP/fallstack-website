import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { tooManyRequestsResponse } from "@/lib/rateLimit";
import {
  checkUploadRateLimit,
  readUploadFile,
  uploadFile,
} from "@/application/services/uploadService";

// Multipart upload: defineHandler's schema parses JSON only.
export const POST = defineHandler({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  handler: async ({ req, session }) => {
    const rate = checkUploadRateLimit("avatar", session!.id);
    if (!rate.allowed) return tooManyRequestsResponse(rate.retryAfterMs);
    const file = await readUploadFile(req, "avatar");
    return NextResponse.json(await uploadFile("avatar", file), {
      status: 201,
    });
  },
});
