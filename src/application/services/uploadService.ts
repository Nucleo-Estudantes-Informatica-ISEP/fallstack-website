import "server-only";

import { Readable } from "node:stream";
import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";

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

/**
 * Reads and validates a multipart upload request, enforcing byte limits
 * without accumulating the full body in a single buffer or duplicating buffers.
 *
 * A byte-counting TransformStream wraps the request body before multipart
 * parsing so the limit is enforced in-flight before the whole body is buffered.
 */
export async function readUploadFile(request: Request, kind: StorageBucket) {
  const maxBodySize = config.uploads[kind].maxSize + 16 * 1024;
  const declaredHeader = request.headers.get("content-length");
  if (declaredHeader) {
    const declaredSize = Number(declaredHeader);
    if (!Number.isFinite(declaredSize) || declaredSize > maxBodySize) {
      throw new HttpError("File too large", 413);
    }
  }
  if (!request.body) throw new HttpError("Missing file", 400);

  let bytesRead = 0;
  const boundedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytesRead += chunk.byteLength;
        if (bytesRead > maxBodySize) {
          controller.error(new HttpError("File too large", 413));
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );

  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: boundedBody,
      // @ts-expect-error — duplex is required by the Fetch spec when body is a stream
      duplex: "half",
    }).formData();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && error.cause instanceof HttpError)
      throw error.cause;
    throw new HttpError("Missing file", 400);
  }

  const file = form.get("file");
  if (!file || typeof file === "string")
    throw new HttpError("Missing file", 400);
  return file;
}

/**
 * Validates and streams a file directly to object storage without ever
 * materialising the full file bytes in the application process.
 *
 * Magic-byte validation reads only the leading 16 bytes via file.slice(),
 * ensuring negligible memory overhead. The full file stream is piped directly
 * to PutObjectCommand via Node.js Readable.fromWeb so at most standard network
 * buffers reside in memory during upload.
 *
 * On any upload failure the key is deleted so partial objects cannot become
 * attachable CVs, coordinating with the retention and orphan cleanup workflow.
 */
export async function uploadFile(kind: StorageBucket, file: File) {
  const { types, maxSize } = config.uploads[kind];
  if (!(types as readonly string[]).includes(file.type))
    throw new HttpError("Invalid file type", 400);
  if (file.size > maxSize) throw new HttpError("File too large", 400);

  // Read only the leading magic bytes for signature validation without
  // materializing the full file into memory.
  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesDeclaredType(headerBytes, file.type))
    throw new HttpError("File content does not match its type", 400);

  const id = uuidv4();
  const key =
    kind === "avatar"
      ? avatarKey(id)
      : kind === "logo"
        ? logoKey(id)
        : cvKey(id);

  const bodyStream =
    typeof file.stream === "function"
      ? Readable.fromWeb(
          file.stream() as import("node:stream/web").ReadableStream
        )
      : Readable.from(Buffer.from(await file.arrayBuffer()));

  try {
    await putObjectStream(kind, key, bodyStream, file.type, file.size);
  } catch (error) {
    bodyStream.destroy();
    void deleteObject(kind, key).catch(() => {
      // Best-effort cleanup; unattached orphan keys will be reclaimed by
      // the daily storage-cleanup job.
    });
    throw error;
  }

  return kind === "avatar"
    ? { id, url: publicAvatarUrl(id) }
    : kind === "logo"
      ? { id, url: publicLogoUrl(id) }
      : { id };
}
