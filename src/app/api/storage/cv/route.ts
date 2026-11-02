import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
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
    const blocked = rateLimitResponse(
      await checkUploadRateLimit("cv", session!.id)
    );
    if (blocked) return blocked;
    const file = await readUploadFile(req, "cv");
    return NextResponse.json(await uploadFile("cv", file), {
      status: 201,
    });
  },
});
