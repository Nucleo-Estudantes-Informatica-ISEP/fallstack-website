-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- AlterTable: add the new columns first, backfill from the boolean being
-- replaced, then drop it - existing isAdmin=true users become ADMIN (the
-- narrower tier; nobody is auto-promoted to SUPER_ADMIN by this migration).
ALTER TABLE "User"
  ADD COLUMN     "adminRole" "AdminRole",
  ADD COLUMN     "name" TEXT,
  ALTER COLUMN "role" DROP NOT NULL,
  ALTER COLUMN "role" DROP DEFAULT;

UPDATE "User" SET "adminRole" = 'ADMIN' WHERE "isAdmin" = true;

ALTER TABLE "User" DROP COLUMN "isAdmin";
