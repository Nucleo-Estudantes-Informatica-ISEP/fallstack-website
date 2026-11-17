import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { initiateCvMultipartUpload } from "@/application/services/directCvUploadService";
import { checkUploadRateLimit } from "@/application/services/uploadService";
import { canCreateStudentProfile } from "@/domain/auth/authPolicy";
import { directCvUploadSchema } from "@/schemas/directCvUploadSchema";

export const POST = defineHandler({
  auth: "session",
  authorize: canCreateStudentProfile,
  handler: async ({ req, session }) => {
    const blocked = rateLimitResponse(
      await checkUploadRateLimit("cv", session!.id)
    );
    if (blocked) return blocked;
    // Limit before parsing: shared Redis outages/429 never read the body.
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json(
        { error: "Use the direct upload JSON protocol" },
        { status: 415 }
      );
    const body = directCvUploadSchema.parse(
      await req.json().catch(() => undefined)
    );
    return NextResponse.json(
      await initiateCvMultipartUpload(session!.id, body),
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  },
});
