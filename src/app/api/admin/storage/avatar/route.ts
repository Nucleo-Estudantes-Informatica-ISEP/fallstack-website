import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  readUploadFile,
  uploadFile,
} from "@/application/services/uploadService";

// Multipart upload: defineHandler's schema parses JSON only.
export const POST = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const file = await readUploadFile(req, "avatar");
    const result = await uploadFile("avatar", file);
    return NextResponse.json(
      { ...result, contentType: file.type, size: file.size },
      { status: 201 }
    );
  },
});
