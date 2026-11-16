import "server-only";

import { randomUUID } from "node:crypto";
import type { z } from "zod";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { storageEnv } from "@/config/env.storage";
import { quarantineCvKey, validCvEnvelope } from "@/domain/cvUpload";
import { actionNames } from "@/edition/actions";
import { directCvUploadSchema } from "@/schemas/directCvUploadSchema";

import {
  cancelPendingCvUpload,
  claimCvUpload,
  consumeCvUpload,
  createCvUpload,
  findCvUpload,
  finishCvValidation,
  releaseCvUpload,
} from "../repositories/cvUploadRepository";
import {
  findStudentProfileById,
  updateStudentMedia,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { completeAction } from "./actionService";
import {
  cvKey,
  deleteObject,
  headCvObject,
  presignCvPost,
  promoteCvObject,
  readCvRange,
} from "./objectStorageService";

export async function initiateCvUpload(
  ownerId: string,
  input: z.infer<typeof directCvUploadSchema>
) {
  const body = directCvUploadSchema.parse(input);
  const id = randomUUID();
  const post = await presignCvPost(quarantineCvKey(id), body.size);
  const expiresAt = new Date(
    Date.now() + storageEnv.CV_UPLOAD_TTL_SECONDS * 1000
  );
  await createCvUpload({ id, ownerId, size: body.size, expiresAt });
  return { uploadId: id, ...post, expiresAt: expiresAt.toISOString() };
}

const discardQuarantine = (id: string) =>
  deleteObject("cv", quarantineCvKey(id), AbortSignal.timeout(5_000)).catch(
    () => {
      // Replayed POSTs and failed deletes are also reclaimed by scheduled cleanup.
    }
  );

export async function finalizeCvUpload(ownerId: string, uploadId: string) {
  const ticket = await findCvUpload(uploadId, ownerId);
  if (!ticket) throw new HttpError("Upload not found", 404);
  if (
    (ticket.status === "ready" || ticket.status === "attached") &&
    ticket.cvId
  )
    return { id: ticket.cvId };
  if (ticket.expiresAt.getTime() <= Date.now())
    throw new HttpError("Upload expired", 410);
  const attemptId = randomUUID();
  if (!(await claimCvUpload(uploadId, ownerId, attemptId, new Date())))
    throw new HttpError("Upload unavailable or finalization in progress", 409);
  // A stale/crashed attempt can never overwrite a later published destination.
  const cvId = randomUUID();
  const key = quarantineCvKey(uploadId);
  const signal = AbortSignal.timeout(30_000);
  try {
    const head = await headCvObject(key, signal);
    if (
      !head.ETag ||
      !head.ContentLength ||
      head.ContentLength !== ticket.size ||
      head.ContentLength > config.uploads.cv.maxSize ||
      head.ContentType !== "application/pdf"
    )
      throw new HttpError("Invalid uploaded file size or type", 400);
    const size = head.ContentLength;
    const [header, tail] = await Promise.all([
      readCvRange(key, 0, Math.min(15, size - 1), head.ETag, signal),
      readCvRange(key, Math.max(0, size - 1024), size - 1, head.ETag, signal),
    ]);
    if (!validCvEnvelope(header, tail))
      throw new HttpError("Invalid or truncated PDF", 400);
    await promoteCvObject(key, cvKey(cvId), head.ETag, signal);
    // Storage I/O is complete before taking a DB transaction/row lock.
    const student = await findStudentProfileById(ownerId);
    await withTransaction(async (tx) => {
      await finishCvValidation(uploadId, ownerId, attemptId, cvId, tx);
      if (student) {
        const attached = await consumeCvUpload(ownerId, cvId, tx);
        if (attached) {
          await updateStudentMedia(ownerId, { cv: cvId }, tx);
          await completeAction(student.code, actionNames.uploadCv, tx);
        }
      }
    });
  } catch (error) {
    const invalid = error instanceof HttpError && error.status === 400;
    const superseded =
      error instanceof HttpError &&
      error.status === 409 &&
      error.message === "CV upload superseded";
    const terminal = invalid || superseded;
    const released = (await releaseCvUpload(
      uploadId,
      attemptId,
      terminal
    ).catch(() => ({ count: 0 }))) as { count: number } | undefined;
    if (terminal && released?.count === 1) await discardQuarantine(uploadId);
    // Never delete the candidate here: a DB commit response could be lost.
    // Existing orphan reconciliation safely reclaims unpublished destinations.
    if (error instanceof HttpError) throw error;
    throw new HttpError("Storage unavailable; retry finalization", 503);
  }
  await discardQuarantine(uploadId);
  return { id: cvId };
}

export async function cancelCvUpload(ownerId: string, uploadId: string) {
  const ticket = await findCvUpload(uploadId, ownerId);
  if (!ticket) throw new HttpError("Upload not found", 404);
  if (ticket.status === "cancelled") return;
  if ((await cancelPendingCvUpload(uploadId, ownerId)).count !== 1)
    throw new HttpError("Upload cannot be cancelled", 409);
  await discardQuarantine(uploadId);
}
