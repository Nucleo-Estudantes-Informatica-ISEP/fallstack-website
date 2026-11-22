import { NextResponse } from "next/server";

import { defineHandler, readJsonBody } from "@/lib/http/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { initiateCvUpload } from "@/application/services/directCvUploadService";
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
    const body = directCvUploadSchema.parse(await readJsonBody(req));
    return NextResponse.json(await initiateCvUpload(session!.id, body), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  },
});
