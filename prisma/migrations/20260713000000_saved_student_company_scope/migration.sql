-- AlterTable: add companyId as nullable so it can be backfilled first
ALTER TABLE "SavedStudent" ADD COLUMN "companyId" UUID;

-- Backfill companyId from the saving employee's company
UPDATE "SavedStudent" ss
SET "companyId" = e."companyId"
FROM "Employee" e
WHERE e."id" = ss."employeeId";

-- Collapse pre-existing duplicate company saves (same student saved by more
-- than one employee of the same company), keeping the earliest save per
-- (studentId, companyId) and dropping the rest.
DELETE FROM "SavedStudent" ss
USING "SavedStudent" keep
WHERE ss."studentId" = keep."studentId"
  AND ss."companyId" = keep."companyId"
  AND (ss."createdAt", ss."employeeId") > (keep."createdAt", keep."employeeId");

-- AlterTable: enforce NOT NULL now that every row is backfilled
ALTER TABLE "SavedStudent" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SavedStudent_studentId_companyId_key" ON "SavedStudent"("studentId", "companyId");

-- AddForeignKey
ALTER TABLE "SavedStudent" ADD CONSTRAINT "SavedStudent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
