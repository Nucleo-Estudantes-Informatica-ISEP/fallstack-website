-- CreateTable
CREATE TABLE "ScheduleEvent" (
    "id" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- Backfill the current edition's timetable that used to live only in
-- src/edition/ScheduleDays.ts (see prisma/migrations/20260714023514_add_sponsor_table
-- for the same backfill-in-migration pattern - prisma/seed.ts is disabled in
-- production, so this is the only path that actually populates this table
-- there). ScheduleDays.ts only ever recorded a single "hour" per entry, so
-- endTime is derived here as the next entry's startTime within the same
-- day; the last entry of each day has no natural next start, so its
-- endTime is a 30-minute placeholder - editable like everything else once
-- the admin board (#203) exists.
INSERT INTO "ScheduleEvent" ("id", "day", "order", "startTime", "endTime", "activity", "updatedAt")
VALUES
  (gen_random_uuid(), 1, 0, '09:45', '10:00', 'Abertura do Evento', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 1, '10:00', '10:40', 'Pitch das Empresas Participantes', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 2, '10:40', '11:10', 'Coffee Break', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 3, '11:10', '13:00', 'Pitch das Empresas Participantes', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 4, '13:00', '14:30', 'Pausa para Almoço', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 5, '14:30', '14:55', 'Sessão de Esclarecimento com a Prof. Elsa Ferreira Gomes', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 6, '14:55', '15:35', 'Pitch das Empresas Participantes', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 7, '15:35', '16:10', 'Coffee Break', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 1, 8, '16:10', '16:40', 'Pitch das Empresas Participantes', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 0, '10:00', '10:30', 'Sessão de Connection''s Train', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 1, '10:30', '11:00', 'Coffee Break', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 2, '11:00', '12:30', 'Sessão de Connection''s Train', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 3, '12:30', '14:30', 'Pausa para Almoço', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 4, '14:30', '15:30', 'Sessão de Connection''s Train', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 5, '15:30', '16:00', 'Coffee Break', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 2, 6, '16:00', '16:30', 'Sessão de Connection''s Train', CURRENT_TIMESTAMP);
