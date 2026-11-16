import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import {
  checkUploadRateLimit,
  uploadFile,
} from "@/application/services/uploadService";

// Multipart upload: defineHandler's schema parses JSON only.
export const POST = defineHandler({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  handler: async ({ req, session }) => {
    const blocked = rateLimitResponse(
      await checkUploadRateLimit("avatar", session!.id)
    );
    if (blocked) return blocked;
    const { id, url } = await uploadFile("avatar", req);
    return NextResponse.json({ id, url }, { status: 201 });
  },
});
