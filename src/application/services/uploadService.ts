import "server-only";

import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { sanitizeLogoSvg } from "@/lib/svgLogo";

import { withMultipartFile } from "./multipartUploadService";
import {
  avatarKey,
  cvKey,
  deleteObject,
  logoKey,
  publicAvatarUrl,
  publicLogoUrl,
  putObjectStream,
  type StorageBucket,
} from "./objectStorageService";
import { checkRateLimit } from "./rateLimitService";

export const checkUploadRateLimit = (
  kind: "avatar" | "cv",
  studentId: string
) =>
  checkRateLimit(
    kind === "cv" ? "upload_cv" : "upload_avatar",
    studentId,
    config.uploads[kind].rateLimit
  );

/** Owns staging, validation, storage and cleanup as one request lifecycle. */
export async function uploadFile(kind: StorageBucket, request: Request) {
  return withMultipartFile(
    request,
    config.uploads[kind].maxSize,
    async (file, signal) => {
      if (
        !(config.uploads[kind].types as readonly string[]).includes(file.type)
      )
        throw new HttpError("Invalid file type", 400);
      if (kind === "logo" && file.type === "image/svg+xml") {
        const sanitized = sanitizeLogoSvg(await readFile(file.path));
        if (sanitized.length > config.uploads.logo.maxSize)
          throw new HttpError("File too large", 400);
        await writeFile(file.path, sanitized);
        file.size = sanitized.length;
      } else if (!matchesDeclaredType(file.header, file.type))
        throw new HttpError("File content does not match its type", 400);

      const id = uuidv4();
      const key =
        kind === "avatar"
          ? avatarKey(id)
          : kind === "logo"
            ? logoKey(id)
            : cvKey(id);
      const body = createReadStream(file.path);
      try {
        await putObjectStream(kind, key, body, file.type, file.size, signal);
        signal.throwIfAborted();
      } catch (error) {
        body.destroy();
        // A PUT can succeed even if its response is lost. Never return the id on
        // failure; delete best-effort using a separate, bounded cleanup signal.
        try {
          await deleteObject(kind, key, AbortSignal.timeout(5_000));
        } catch {
          // Existing orphan reconciliation reclaims unattached objects after
          // seven days. No database reference has been created by this service.
        }
        throw error;
      } finally {
        body.destroy();
      }

      return {
        id,
        ...(kind === "avatar"
          ? { url: publicAvatarUrl(id) }
          : kind === "logo"
            ? { url: publicLogoUrl(id) }
            : {}),
        contentType: file.type,
        size: file.size,
      };
    }
  );
}
