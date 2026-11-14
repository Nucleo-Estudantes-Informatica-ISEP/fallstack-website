import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { uploadFile } from "@/application/services/uploadService";

// Multipart upload: defineHandler's schema parses JSON only.
export const POST = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const result = await uploadFile("logo", req);
    return NextResponse.json(result, { status: 201 });
  },
});
