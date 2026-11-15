import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { finalizeCvUpload } from "@/application/services/directCvUploadService";
import { cvUploadIdSchema } from "@/schemas/directCvUploadSchema";

export const POST = defineHandler({
  auth: "session",
  authorize: (session) => session.role === "STUDENT",
  schema: cvUploadIdSchema,
  handler: async ({ session, body }) =>
    NextResponse.json(await finalizeCvUpload(session!.id, body.uploadId), {
      headers: { "Cache-Control": "no-store" },
    }),
});
