import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { uploadCompanyVideo } from "@/application/services/companyVideoService";

export const runtime = "nodejs";
// Raw MP4 body: spool a bounded upload to disk rather than buffering multipart video in RAM.
export const POST = defineHandler({
  auth: "admin",
  handler: async ({ req }) =>
    NextResponse.json(await uploadCompanyVideo(req), { status: 201 }),
});
