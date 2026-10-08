import "server-only";

import {
  pendingStorageDeletions,
  planStorageCleanup,
  recordStorageDeletion,
  type CleanupObject,
} from "../repositories/storageCleanupRepository";
import {
  assertUnversionedBucket,
  deleteObject,
  listObjects,
} from "./objectStorageService";

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const PATTERNS = {
  avatar: new RegExp(`^distribution/avatar/${UUID}$`),
  cv: new RegExp(`^distribution/cv/${UUID}\\.pdf$`),
};

export async function runStorageCleanup({
  now = new Date(),
  apply = false,
  audit = (event: Record<string, unknown>) => {
    void event;
  },
} = {}) {
  const objects: CleanupObject[] = [];
  // Finish listings/versioning checks before any DB mutations. A partial
  // listing or denied bucket must never be mistaken for an empty bucket.
  for (const kind of ["avatar", "cv"] as const) {
    await assertUnversionedBucket(kind);
    const files = await listObjects(kind, `distribution/${kind}`);
    for (const file of files) {
      if (
        file.Key &&
        PATTERNS[kind].test(file.Key) &&
        file.LastModified &&
        file.LastModified.getTime() < now.getTime() - 48 * 60 * 60 * 1000
      ) {
        objects.push({ kind, key: file.Key });
      }
    }
  }
  const plan = await planStorageCleanup(now, objects, apply);
  for (const row of plan.expired)
    audit({ action: apply ? "cv-detached" : "cv-would-detach", key: row.key });
  for (const row of plan.orphans)
    audit({ action: apply ? "queued" : "would-queue", ...row });
  if (plan.unknownAge)
    audit({
      level: "warn",
      action: "unknown-cv-upload-age",
      count: plan.unknownAge,
    });
  const pending = await pendingStorageDeletions();
  let deleted = 0;
  let failed = 0;
  for (const row of pending) {
    if (!apply) {
      audit({ action: "would-retry", kind: row.kind, key: row.key });
      continue;
    }
    if (row.kind !== "avatar" && row.kind !== "cv")
      throw new Error("Invalid cleanup queue kind");
    if (!PATTERNS[row.kind].test(row.key))
      throw new Error("Invalid cleanup queue key");
    let error: string | null = null;
    try {
      await deleteObject(row.kind, row.key);
    } catch (cause) {
      // Record codes only: SDK messages/URLs may include credentials or data.
      error =
        cause instanceof Error ? cause.name.slice(0, 100) : "UnknownError";
    }
    // If this write fails after S3 succeeds, the pending row survives and an
    // idempotent DeleteObject on the next run closes the crash window.
    await recordStorageDeletion(row.kind, row.key, now, error);
    if (error) failed++;
    else deleted++;
    audit({
      level: error ? "error" : "info",
      action: error ? "delete-failed" : "deleted",
      kind: row.kind,
      key: row.key,
      error,
    });
  }
  return {
    mode: apply ? "apply" : "dry-run",
    expired: plan.expired.length,
    orphans: plan.orphans.length,
    pending: pending.length,
    unknownAge: plan.unknownAge,
    deleted,
    failed,
  };
}
