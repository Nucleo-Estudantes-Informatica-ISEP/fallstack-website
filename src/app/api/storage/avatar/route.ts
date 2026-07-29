import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { defineHandler } from "@/lib/http/server";
import { reportError } from "@/lib/logger";
import { createRateLimiter, tooManyRequestsResponse } from "@/lib/rateLimit";
import { storageUploadTicketSchema } from "@/schemas/storageUploadTicketSchema";
import { createAdminClient } from "@/utils/supabase/admin";

const rateLimiter = createRateLimiter(config.uploads.avatar.rateLimit);

export const POST = defineHandler<
  Record<string, never>,
  typeof storageUploadTicketSchema
>({
  auth: "student",
  schema: storageUploadTicketSchema,
  handler: async ({ session, body }) => {
    const { allowed, retryAfterMs } = rateLimiter.check(session!.id);
    if (!allowed) return tooManyRequestsResponse(retryAfterMs);

    const { contentType, size } = body;
    const { types, maxSize } = config.uploads.avatar;

    if (!types.includes(contentType))
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    if (size > maxSize)
      return NextResponse.json({ error: "File too large" }, { status: 400 });

    const id = uuidv4();
    const path = `distribution/avatar/${id}`;
    const { data, error } = await createAdminClient()
      .storage.from("avatars")
      .createSignedUploadUrl(path);

    if (error || !data) {
      reportError(
        error ?? new Error("Storage returned no upload ticket"),
        {
          operation: "create_avatar_upload_ticket",
          route: "/api/storage/avatar",
          method: "POST",
        },
        "Avatar storage upload ticket failed"
      );
      throw new HttpError("Upload service unavailable", 502);
    }

    return NextResponse.json({ id, path, token: data.token }, { status: 201 });
  },
});
