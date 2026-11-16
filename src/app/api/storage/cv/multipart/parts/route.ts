import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { signCvUploadPart } from "@/application/services/directCvUploadService";
import { checkRateLimit } from "@/application/services/rateLimitService";
import { cvUploadPartSchema } from "@/schemas/directCvUploadSchema";

export const POST = defineHandler({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  handler: async ({ req, session }) => {
    const blocked = rateLimitResponse(
      await checkRateLimit("upload_cv_part", session!.id, {
        max: 60,
        windowMs: 60000,
      })
    );
    if (blocked) return blocked;
    const body = cvUploadPartSchema.parse(
      await req.json().catch(() => undefined)
    );
    return NextResponse.json(
      await signCvUploadPart(
        session!.id,
        body.uploadId,
        body.partNumber,
        body.checksum
      ),
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  },
});
