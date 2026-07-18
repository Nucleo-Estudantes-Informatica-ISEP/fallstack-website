-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "website" TEXT;

-- Backfill the public roster that used to live only in edition/*Companies.tsx
-- (logos are the pre-existing static assets under public/assets/images/companies,
-- referenced here by their public path - no re-upload needed). Upserts by name
-- so a company that already exists (e.g. self-registered for recruiting) gets
-- its display fields filled in rather than duplicated.
INSERT INTO "Company" ("id", "name", "tier", "avatar", "website", "active", "order", "updatedAt")
VALUES
  (gen_random_uuid(), 'APR - Technology Solutions', 'DIAMOND', '/assets/images/companies/diamond/apr.webp', 'https://www.apr.pt', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'armis', 'DIAMOND', '/assets/images/companies/diamond/armis.webp', 'https://www.armisgroup.com/pt', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Cloudflare', 'DIAMOND', '/assets/images/companies/diamond/cloudflare.webp', 'https://www.cloudflare.com/', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'hitachi', 'DIAMOND', '/assets/images/companies/diamond/hitachi.webp', 'https://hitachi-solutions.pt/', true, 3, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'CGI', 'GOLD', '/assets/images/companies/gold/cgi.webp', 'https://www.cgi.com/', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'deloitte', 'GOLD', '/assets/images/companies/gold/deloitte.webp', 'https://www2.deloitte.com/pt/pt.html', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Devscope', 'GOLD', '/assets/images/companies/gold/devscope.webp', 'https://devscope.net', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Devoteam', 'GOLD', '/assets/images/companies/gold/devoteam.webp', 'https://www.niw.pt/', true, 3, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'glintt', 'SILVER', '/assets/images/companies/silver/glintt.webp', 'https://www.glinttglobal.com/', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'accenture', 'SILVER', '/assets/images/companies/silver/accenture.webp', 'https://www.accenture.com/', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Cegid', 'SILVER', '/assets/images/companies/silver/cegid.webp', 'https://www.cegid.com/ib/pt/', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Itim', 'SILVER', '/assets/images/companies/silver/itim.webp', 'https://www.itim.com/', true, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'msg insur:it', 'SILVER', '/assets/images/companies/silver/msg.webp', 'https://msg-insurit.com/pt-pt/', true, 4, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'Euronext', 'BRONZE', '/assets/images/companies/bronze/euronext.webp', 'https://www.euronext.com/', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Liderteam', 'BRONZE', '/assets/images/companies/bronze/liderteam.webp', 'https://www.liderteam.pt/', true, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "tier" = EXCLUDED."tier",
  "avatar" = EXCLUDED."avatar",
  "website" = EXCLUDED."website",
  "active" = EXCLUDED."active",
  "order" = EXCLUDED."order";
