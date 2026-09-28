import "server-only";

import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { createRateLimiter } from "@/lib/rateLimit";

import {
  avatarKey,
  cvKey,
  logoKey,
  publicAvatarUrl,
  publicLogoUrl,
  putObject,
  type StorageBucket,
} from "./objectStorageService";

const limiters = {
  avatar: createRateLimiter(config.uploads.avatar.rateLimit),
  cv: createRateLimiter(config.uploads.cv.rateLimit),
};

export const checkUploadRateLimit = (
  kind: "avatar" | "cv",
  studentId: string
) => limiters[kind].check(studentId);

export async function readUploadFile(request: Request, kind: StorageBucket) {
  const maxBodySize = config.uploads[kind].maxSize + 16 * 1024;
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > maxBodySize) throw new HttpError("File too large", 413);
  if (!request.body) throw new HttpError("Missing file", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodySize) {
        await reader.cancel();
        throw new HttpError("File too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const form = await new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: Buffer.concat(chunks),
  }).formData();
  const file = form.get("file");
  if (!file || typeof file === "string")
    throw new HttpError("Missing file", 400);
  return file;
}

export async function uploadFile(kind: StorageBucket, file: File) {
  const { types, maxSize } = config.uploads[kind];
  if (!(types as readonly string[]).includes(file.type))
    throw new HttpError("Invalid file type", 400);
  if (file.size > maxSize) throw new HttpError("File too large", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredType(bytes, file.type))
    throw new HttpError("File content does not match its type", 400);

  const id = uuidv4();
  await putObject(
    kind,
    kind === "avatar"
      ? avatarKey(id)
      : kind === "logo"
        ? logoKey(id)
        : cvKey(id),
    bytes,
    file.type
  );
  return kind === "avatar"
    ? { id, url: publicAvatarUrl(id) }
    : kind === "logo"
      ? { id, url: publicLogoUrl(id) }
      : { id };
}
