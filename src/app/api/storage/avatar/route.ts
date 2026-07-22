import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { reportError } from "@/lib/logger";
import { createRateLimiter, getClientIp } from "@/lib/rateLimit";
import { createAdminClient } from "@/utils/supabase/admin";

const rateLimiter = createRateLimiter(config.uploads.avatar.rateLimit);

// Not a defineHandler route: multipart/form-data body (defineHandler's
// schema option parses JSON) and, pre-existing, no auth check at all -
// tracked separately (#26), not something this refactor changes.
export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = rateLimiter.check(getClientIp(req));
  if (!allowed)
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const contentType = file.type;
  const { types, maxSize } = config.uploads.avatar;

  if (!types.includes(contentType))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > maxSize)
    return NextResponse.json({ error: "File too large" }, { status: 400 });

  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);

  if (!matchesDeclaredType(bytes, contentType))
    return NextResponse.json(
      { error: "File content does not match its type" },
      { status: 400 }
    );

  const id = uuidv4();
  const path = `distribution/avatar/${id}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType });

  if (error) {
    reportError(
      error,
      {
        operation: "upload_avatar",
        route: "/api/storage/avatar",
        method: "POST",
      },
      "Avatar storage upload failed"
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  return NextResponse.json({
    id,
    url: publicUrl,
    contentType,
    size: file.size,
  });
}
