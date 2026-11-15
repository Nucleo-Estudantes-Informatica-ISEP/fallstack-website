import "server-only";

import { deleteObject, listObjects } from "./objectStorageService";

/** The 24h grace exceeds every signed URL/lease. Even a replay after cancel or
 * finalize is eventually removed. Never depends on a browser callback. */
export async function listExpiredCvQuarantine(now: Date, signal?: AbortSignal) {
  const objects = await listObjects("cv", "quarantine/cv", signal);
  return objects
    .filter(
      (object) =>
        object.Key &&
        /^quarantine\/cv\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          object.Key
        ) &&
        object.LastModified &&
        object.LastModified.getTime() < now.getTime() - 86_400_000
    )
    .map((object) => object.Key!);
}

export async function cleanupCvQuarantine(
  now: Date,
  apply: boolean,
  signal?: AbortSignal
) {
  const keys = await listExpiredCvQuarantine(now, signal);
  let deleted = 0;
  if (apply) {
    for (const key of keys) {
      try {
        await deleteObject("cv", key, signal);
        deleted++;
      } catch (cause) {
        signal?.throwIfAborted();
      }
    }
    return deleted;
  }
  return keys.length;
}
