import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { cancelCvUpload } from "@/application/services/directCvUploadService";
import { cvUploadIdSchema } from "@/schemas/directCvUploadSchema";

export const POST = defineHandler({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  schema: cvUploadIdSchema,
  handler: async ({ session, body }) => {
    await cancelCvUpload(session!.id, body.uploadId);
    return NextResponse.json({ ok: true });
  },
});
