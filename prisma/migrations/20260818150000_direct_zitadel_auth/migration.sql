-- Keep application-owned UUIDs and attach the external ZITADEL subject.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "zitadelUserId" TEXT;

-- The one-off pre-cutover script created a partial unique index. Normalize it
-- to the regular Prisma @unique shape; PostgreSQL permits multiple NULLs in a
-- normal unique index, so existing unlinked test rows remain valid.
DROP INDEX IF EXISTS "User_zitadelUserId_key";
CREATE UNIQUE INDEX "User_zitadelUserId_key"
  ON "User"("zitadelUserId");

-- Employee company invite codes are bearer credentials. Keep legacy `code`
-- during cutover, but authenticate onboarding against a SHA-256 hash.
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "employeeInviteCodeHash" TEXT;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "employeeInviteCodeUpdatedAt" TIMESTAMP(3);

-- The one-off pre-cutover script used timestamptz while Prisma maps DateTime
-- here to timestamp(3). Convert only when that pre-existing type is actually
-- present. Running this migration on a fresh database must not apply a
-- timezone conversion to the TIMESTAMP column that was just created above.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Company'
      AND column_name = 'employeeInviteCodeUpdatedAt'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE "Company"
      ALTER COLUMN "employeeInviteCodeUpdatedAt" TYPE TIMESTAMP(3)
      USING "employeeInviteCodeUpdatedAt" AT TIME ZONE 'UTC';
  END IF;
END $$;

DROP INDEX IF EXISTS "Company_employeeInviteCodeHash_key";
CREATE UNIQUE INDEX "Company_employeeInviteCodeHash_key"
  ON "Company"("employeeInviteCodeHash");
