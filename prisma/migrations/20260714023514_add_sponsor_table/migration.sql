-- CreateTable
CREATE TABLE "Sponsor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "website" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_name_key" ON "Sponsor"("name");

-- Backfill the sponsors that used to live only in edition/Sponsors.ts
-- (logos are the pre-existing static assets under public/assets/images/sponsors,
-- referenced here by their public path - no re-upload needed).
INSERT INTO "Sponsor" ("id", "name", "logo", "website", "active", "order", "updatedAt")
VALUES
  (gen_random_uuid(), 'Confeitaria Divinal', '/assets/images/sponsors/divinal.png', 'https://www.facebook.com/divinal.porto/?locale=pt_PT', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AEISEP', '/assets/images/sponsors/aeisep.png', 'https://www.aeisep.pt/', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DEI ISEP', '/assets/images/sponsors/dei.png', 'https://dei.isep.ipp.pt/', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Melhor Croissant da minha rua', '/assets/images/sponsors/melhorCroissant.png', 'https://omelhorcroissantdaminharua.com/', true, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Dominos', '/assets/images/sponsors/dominos.png', 'https://dominos.pt/', true, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Boca Doce', '/assets/images/sponsors/bocaDoce.png', 'https://www.facebook.com/bemmequergrupobocadoce/', true, 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Start Ilusion', '/assets/images/sponsors/startIlusion.png', 'https://www.startilusion.pt/', true, 6, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
