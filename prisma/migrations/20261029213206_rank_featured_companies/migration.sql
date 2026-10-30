-- AlterTable
ALTER TABLE "CompanyRankStyle" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Initial organizer selection; later changes use the backoffice flag.
UPDATE "CompanyRankStyle" AS style
SET "isFeatured" = true
FROM "CompanyRank" AS rank
WHERE style."rankId" = rank.id AND lower(trim(rank.name)) = 'main';
