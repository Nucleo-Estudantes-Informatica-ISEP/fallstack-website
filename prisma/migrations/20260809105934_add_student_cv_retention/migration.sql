-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "cvUploadedAt" TIMESTAMP(3),
ADD COLUMN     "cvPurgedAt" TIMESTAMP(3);

-- Backfill: a CV uploaded before this column existed has no cvUploadedAt,
-- which would make it permanently un-purgeable (NULL < anything is never
-- true in the retention job's candidate query). Stamping it as of this
-- migration gives every existing CV a full 6-month grace period instead of
-- an immediate mass purge on the next scheduled run.
UPDATE "Student" SET "cvUploadedAt" = CURRENT_TIMESTAMP WHERE "cv" IS NOT NULL AND "cvUploadedAt" IS NULL;
