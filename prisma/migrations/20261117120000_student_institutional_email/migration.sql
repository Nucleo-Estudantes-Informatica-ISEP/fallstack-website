ALTER TABLE "Student" ADD COLUMN "institutionalEmail" TEXT;

UPDATE "Student" AS s SET "institutionalEmail" = u.email
FROM "User" AS u WHERE u.id = s.id;
