-- #280 cutover: every consumer now reads Company.rank/CompanyRank instead
-- of the fixed Tier enum (see schema.prisma comments). Defensive backfill
-- first, in case any Company row was created between the previous
-- migration's backfill and this one with no rankId set yet (registerCompany
-- now writes rankId directly, but this keeps the NOT NULL below safe
-- regardless of ordering).
UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE c."rankId" IS NULL AND r."name" = 'Diamond' AND c."tier" = 'DIAMOND';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE c."rankId" IS NULL AND r."name" = 'Gold' AND c."tier" = 'GOLD';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE c."rankId" IS NULL AND r."name" = 'Silver' AND c."tier" = 'SILVER';

UPDATE "Company" c SET "rankId" = r."id"
FROM "CompanyRank" r
WHERE c."rankId" IS NULL AND r."name" = 'Bronze' AND c."tier" = 'BRONZE';

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "rankId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "tier";

-- DropEnum
DROP TYPE "Tier";
