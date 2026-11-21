import { NextResponse } from "next/server";

import { defineHandler, readJsonBody } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { signCvUploadPart } from "@/application/services/directCvUploadService";
import { checkRateLimit } from "@/application/services/rateLimitService";
import { canCreateStudentProfile } from "@/domain/auth/authPolicy";
import { cvUploadPartSchema } from "@/schemas/directCvUploadSchema";

export const POST = defineHandler({
  auth: "session",
  authorize: canCreateStudentProfile,
  handler: async ({ req, session }) => {
    const blocked = rateLimitResponse(
      await checkRateLimit("upload_cv_part", session!.id, {
        max: 60,
        windowMs: 60000,
      })
    );
    if (blocked) return blocked;
    const body = cvUploadPartSchema.parse(await readJsonBody(req));
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
