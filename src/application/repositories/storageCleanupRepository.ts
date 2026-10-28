import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "./database";

export type CleanupObject = { kind: "avatar" | "cv"; key: string };
const BATCH_SIZE = 1000;

export async function planStorageCleanup(
  now: Date,
  objects: CleanupObject[],
  apply: boolean
) {
  return prisma.$transaction(
    async (tx) => {
      if (apply) {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        // shortcut: short table locks suit event scale; use per-key registry locks
        // if media-write contention grows. No S3 I/O inside this transaction.
        await tx.$executeRaw`LOCK TABLE "Student", "Company", "Sponsor" IN SHARE ROW EXCLUSIVE MODE`;
      }
      const utcNow = now.toISOString().slice(0, -1);
      // Map each non-null reference once, rather than rescan all tables for
      // expiry, unknown references and protected keys while holding locks.
      const references = await tx.$queryRaw<
        {
          id: string;
          kind: string;
          key: string | null;
          expired: boolean;
          unknown: boolean;
          unknownAge: boolean;
        }[]
      >`
        WITH refs AS (
          SELECT id, 'cv' AS kind, cv AS reference, "cvUploadedAt" AS uploaded FROM "Student" WHERE cv IS NOT NULL
          UNION ALL SELECT id, 'avatar', avatar, NULL FROM "Student" WHERE avatar IS NOT NULL
          UNION ALL SELECT id, 'avatar', avatar, NULL FROM "Company" WHERE avatar IS NOT NULL
          UNION ALL SELECT id, 'avatar', logo, NULL FROM "Sponsor" WHERE logo IS NOT NULL
        ), mapped AS MATERIALIZED (
          SELECT *, storage_object_key(kind, reference) AS key FROM refs
        )
        SELECT id, kind, key,
          coalesce(kind = 'cv' AND uploaded < ${utcNow}::timestamp - interval '6 months' AND key IS NOT NULL, false) AS expired,
          kind = 'cv' AND uploaded IS NULL AS "unknownAge",
          key IS NULL AND NOT (kind = 'avatar' AND (
            storage_object_key('logo', reference) IS NOT NULL
            OR (reference LIKE '/assets/%' AND NOT storage_reference_path_is_ambiguous(reference))
          )) AS unknown
        FROM mapped ORDER BY uploaded, id
      `;
      const unknownAge = references.filter((row) => row.unknownAge).length;
      const unknownReference = references.filter((row) => row.unknown).length;
      // Fail closed before reference mutations/claims; service also stops retries.
      if (unknownReference)
        return { expired: [], orphans: [], unknownAge, unknownReference };
      const expired = references
        .filter((row) => row.expired)
        .slice(0, BATCH_SIZE);
      const expiredIds = new Set(expired.map(({ id }) => id));
      if (apply && expired.length) {
        await tx.student.updateMany({
          where: { id: { in: [...expiredIds] } },
          data: { cv: null, cvPurgedAt: now },
        });
      }
      const referenced = new Set(
        references
          .filter(
            ({ id, kind, key }) => key && !(kind === "cv" && expiredIds.has(id))
          )
          .map(({ kind, key }) => `${kind}:${key}`)
      );
      const claimed = new Set<string>();
      for (let offset = 0; offset < objects.length; offset += BATCH_SIZE) {
        const existing = await tx.storageDeletion.findMany({
          where: {
            key: {
              in: objects
                .slice(offset, offset + BATCH_SIZE)
                .map(({ key }) => key),
            },
          },
          select: { kind: true, key: true },
        });
        for (const { kind, key } of existing) claimed.add(`${kind}:${key}`);
      }
      const orphans = objects
        // Compare UUIDs case-insensitively; queue/delete the exact S3 key.
        .filter(
          ({ kind, key }) =>
            !referenced.has(`${kind}:${key.toLowerCase()}`) &&
            !claimed.has(`${kind}:${key}`)
        )
        .slice(0, BATCH_SIZE);
      if (apply && orphans.length) {
        await tx.storageDeletion.createMany({
          data: orphans,
          skipDuplicates: true,
        });
      }
      return { expired, orphans, unknownAge, unknownReference };
    },
    {
      isolationLevel: apply
        ? Prisma.TransactionIsolationLevel.ReadCommitted
        : Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 30_000,
    }
  );
}

export const pendingStorageDeletions = () =>
  prisma.storageDeletion.findMany({
    where: { deletedAt: null, quarantinedAt: null },
    // Never-attempted rows first; repeated failures must not starve other keys.
    orderBy: [
      { lastAttemptAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
      { key: "asc" },
    ],
    take: BATCH_SIZE,
  });

export const recordStorageDeletion = (
  kind: string,
  key: string,
  now: Date,
  error: string | null
) =>
  prisma.storageDeletion.updateMany({
    where: { kind, key, deletedAt: null },
    data: {
      attempts: { increment: 1 },
      lastAttemptAt: now,
      lastError: error,
      ...(error === "InvalidCleanupQueueEntry" ? { quarantinedAt: now } : {}),
      ...(error === null ? { deletedAt: now } : {}),
    },
  });

export const disconnectStorageCleanup = () => prisma.$disconnect();
