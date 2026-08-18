-- Keep application-owned UUIDs and attach the external ZITADEL subject.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "zitadelUserId" TEXT;

-- The one-off pre-cutover script created a partial unique index. Normalize it
-- to the regular Prisma @unique shape; PostgreSQL still permits multiple NULLs.
DROP INDEX IF EXISTS "User_zitadelUserId_key";
CREATE UNIQUE INDEX "User_zitadelUserId_key"
  ON "User"("zitadelUserId");

-- Employee company invite codes are bearer credentials. Keep legacy `code`
-- during cutover, but authenticate onboarding against a SHA-256 hash.
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "employeeInviteCodeHash" TEXT;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "employeeInviteCodeUpdatedAt" TIMESTAMP(3);

-- Normalize the type if the pre-cutover script created this as timestamptz.
ALTER TABLE "Company"
  ALTER COLUMN "employeeInviteCodeUpdatedAt" TYPE TIMESTAMP(3)
  USING "employeeInviteCodeUpdatedAt" AT TIME ZONE 'UTC';

DROP INDEX IF EXISTS "Company_employeeInviteCodeHash_key";
CREATE UNIQUE INDEX "Company_employeeInviteCodeHash_key"
  ON "Company"("employeeInviteCodeHash");
