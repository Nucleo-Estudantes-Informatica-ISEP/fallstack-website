-- Preserve storage-backed logos while removing references to deleted static assets.
UPDATE "Company"
SET "avatar" = NULL
WHERE "avatar" LIKE '/assets/images/companies/%';

-- Keep sponsor metadata for re-upload; inactive rows are hidden publicly.
UPDATE "Sponsor"
SET "active" = false
WHERE "logo" LIKE '/assets/images/sponsors/%';
