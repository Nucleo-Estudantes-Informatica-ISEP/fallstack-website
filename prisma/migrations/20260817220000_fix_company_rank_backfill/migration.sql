-- Fixes two data bugs in #280's original backfill
-- (20260809100000_add_company_profile_and_rank), flagged in PR #302 review:
-- that migration already ran on some environments, so it can't be edited in
-- place - this is a follow-up data fix instead.

-- 1. The deleted DiamondCompanies.tsx gave Armis `className: "w-42"`, but
-- the original backfill wrote NULL, shrinking its logo on the roster.
-- Guarded on IS NULL so a deliberate admin edit made since #280 isn't
-- clobbered.
UPDATE "CompanyDisplayStyle" ds
SET "className" = 'w-42'
FROM "Company" c
WHERE ds."companyId" = c."id" AND c."name" = 'armis' AND ds."className" IS NULL;

-- 2. Company.name is rendered as the public profile heading
-- (CompanyPageSection), but four rows were only ever capitalized correctly
-- in the deleted modalInformation.title, not in Company.name itself.
-- Canonicalize to what the old modal showed. Matches on the still-lowercase
-- seeded name, so this is a no-op wherever it already ran or an admin
-- already renamed the row.
UPDATE "Company" SET "name" = 'Armis' WHERE "name" = 'armis';
UPDATE "Company" SET "name" = 'Hitachi Solutions' WHERE "name" = 'hitachi';
UPDATE "Company" SET "name" = 'Deloitte' WHERE "name" = 'deloitte';
UPDATE "Company" SET "name" = 'DevScope' WHERE "name" = 'Devscope';
