-- Preserve storage-backed logos while removing references to deleted static assets.
UPDATE "Company"
SET "avatar" = NULL
WHERE "avatar" LIKE '/assets/images/companies/%';

-- Sponsor.logo is required, so stale legacy rows cannot remain editable or renderable.
-- Current sponsors re-uploaded through the admin backoffice use Storage URLs and remain.
DELETE FROM "Sponsor"
WHERE "logo" LIKE '/assets/images/sponsors/%';
