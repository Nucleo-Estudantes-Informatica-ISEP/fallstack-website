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
        // ponytail: short table locks suit event scale; use per-key registry locks
        // if media-write contention grows. No S3 I/O inside this transaction.
        await tx.$executeRaw`LOCK TABLE "Student", "Company", "Sponsor" IN SHARE ROW EXCLUSIVE MODE`;
      }
      const utcNow = now.toISOString().slice(0, -1);
      const expired = await tx.$queryRaw<{ id: string; key: string | null }[]>`
      SELECT id, storage_object_key('cv', cv) AS key FROM "Student"
      WHERE cv IS NOT NULL AND "cvUploadedAt" < ${utcNow}::timestamp - interval '6 months'
      ORDER BY "cvUploadedAt", id LIMIT ${BATCH_SIZE}
    `;
      const unknownAge = await tx.student.count({
        where: { cv: { not: null }, cvUploadedAt: null },
      });
      if (apply && expired.length) {
        await tx.student.updateMany({
          where: { id: { in: expired.map(({ id }) => id) } },
          data: { cv: null, cvPurgedAt: now },
        });
      }
      // Dry run projects the same detach step without writing anything. Retain
      // keys shared by a fresh or not-yet-selected Student, Company or Sponsor.
      const references = await tx.$queryRaw<
        { kind: string; key: string | null }[]
      >`
      SELECT 'cv' AS kind, storage_object_key('cv', cv) AS key FROM "Student"
      WHERE NOT (id = ANY(${expired.map(({ id }) => id)}::uuid[]))
      UNION ALL
      SELECT 'avatar', storage_object_key('avatar', avatar) FROM "Student"
      UNION ALL
      SELECT 'avatar', storage_object_key('avatar', avatar) FROM "Company"
      UNION ALL
      SELECT 'avatar', storage_object_key('avatar', logo) FROM "Sponsor"
    `;
      const referenced = new Set(
        references
          .filter(({ key }) => key)
          .map(({ kind, key }) => `${kind}:${key}`)
      );
      const orphans = objects
        .filter(({ kind, key }) => !referenced.has(`${kind}:${key}`))
        .slice(0, BATCH_SIZE);
      if (apply && orphans.length) {
        await tx.storageDeletion.createMany({
          data: orphans,
          skipDuplicates: true,
        });
      }
      return { expired, orphans, unknownAge };
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
    where: { deletedAt: null },
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
      ...(error === null ? { deletedAt: now } : {}),
    },
  });

export const disconnectStorageCleanup = () => prisma.$disconnect();
