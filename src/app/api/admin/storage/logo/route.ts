import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { reportError } from "@/lib/logger";
import getServerSession from "@/application/services/sessionService";
import { createAdminClient } from "@/utils/supabase/admin";

// Multipart/form-data stays a plain route because defineHandler parses JSON.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.adminRole)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const { bucket, pathPrefix, types, maxSize } = config.uploads.logo;
  const contentType = file.type;
  if (!(types as readonly string[]).includes(contentType))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > maxSize)
    return NextResponse.json({ error: "File too large" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredType(bytes, contentType))
    return NextResponse.json(
      { error: "File content does not match its type" },
      { status: 400 }
    );

  const id = uuidv4();
  const path = `${pathPrefix}/${id}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, bytes, { contentType });

  if (error) {
    reportError(
      error,
      {
        operation: "upload_logo_admin",
        route: "/api/admin/storage/logo",
        method: "POST",
      },
      "Admin logo storage upload failed"
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json(
    { id, url: data.publicUrl, contentType, size: file.size },
    { status: 201 }
  );
}
