import "server-only";

import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { reportError } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";
import { createAdminClient } from "@/utils/supabase/admin";

type UploadKind = "avatar" | "cv";

interface UploadTicketInput {
  contentType: string;
  size: number;
}

interface UploadTicket {
  id: string;
  path: string;
  token: string;
}

type UploadTicketResult =
  | { allowed: true; ticket: UploadTicket }
  | { allowed: false; retryAfterMs: number };

const uploadKinds = {
  avatar: {
    bucket: "avatars",
    limiter: createRateLimiter(config.uploads.avatar.rateLimit),
    path: (id: string) => `distribution/avatar/${id}`,
    operation: "create_avatar_upload_ticket",
    failureMessage: "Avatar storage upload ticket failed",
  },
  cv: {
    bucket: "cvs",
    limiter: createRateLimiter(config.uploads.cv.rateLimit),
    path: (id: string) => `distribution/cv/${id}.pdf`,
    operation: "create_cv_upload_ticket",
    failureMessage: "CV storage upload ticket failed",
  },
} as const;

export async function createUploadTicket(
  kind: UploadKind,
  studentId: string,
  input: UploadTicketInput
): Promise<UploadTicketResult> {
  const kindConfig = uploadKinds[kind];
  const { allowed, retryAfterMs } = kindConfig.limiter.check(studentId);
  if (!allowed) return { allowed: false, retryAfterMs };

  const { types, maxSize } = config.uploads[kind];
  if (!(types as readonly string[]).includes(input.contentType))
    throw new HttpError("Invalid file type", 400);
  if (input.size > maxSize) throw new HttpError("File too large", 400);

  const id = uuidv4();
  const path = kindConfig.path(id);
  const { data, error } = await createAdminClient()
    .storage.from(kindConfig.bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    reportError(
      error ?? new Error("Storage returned no upload ticket"),
      {
        operation: kindConfig.operation,
        route: `/api/storage/${kind}`,
        method: "POST",
      },
      kindConfig.failureMessage
    );
    throw new HttpError("Upload service unavailable", 502);
  }

  return { allowed: true, ticket: { id, path, token: data.token } };
}
