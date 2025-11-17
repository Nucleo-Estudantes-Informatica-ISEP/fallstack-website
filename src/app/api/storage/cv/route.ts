import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { v4 as uuidv4 } from "uuid";

import config from "@/config";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const contentType = file.type;
  const { types, maxSize } = config.uploads.cv;

  if (!types.includes(contentType))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > maxSize)
    return NextResponse.json({ error: "File too large" }, { status: 400 });

  const id = uuidv4();
  const path = `distribution/cv/${id}.pdf`;

  const admin = createAdminClient();
  const ab = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("cvs")
    .upload(path, new Uint8Array(ab), { contentType });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id, contentType, size: file.size });
}
