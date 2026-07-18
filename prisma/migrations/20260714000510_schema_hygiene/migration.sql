-- CreateEnum
CREATE TYPE "Year" AS ENUM ('1º Ano Licenciatura', '2º Ano Licenciatura', '3º Ano Licenciatura', '1º Ano Mestrado', '2º Ano Mestrado');

-- DropIndex (redundant: Company.name and Student.code already have @unique,
-- which creates its own index)
DROP INDEX "Company_name_idx";
DROP INDEX "Student_code_idx";

-- Standardize UUID typing on Action/ActionCompletion (previously stored as
-- text while every other model uses @db.Uuid). Cast in place instead of
-- Prisma's default drop-and-recreate plan so existing rows survive; the FK
-- has to come off first since Postgres won't let the referenced/referencing
-- columns disagree in type mid-alter.
ALTER TABLE "ActionCompletion" DROP CONSTRAINT "ActionCompletion_actionId_fkey";

ALTER TABLE "Action" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid);
ALTER TABLE "ActionCompletion" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid);
ALTER TABLE "ActionCompletion" ALTER COLUMN "actionId" TYPE UUID USING ("actionId"::uuid);

ALTER TABLE "ActionCompletion" ADD CONSTRAINT "ActionCompletion_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: creation timestamps
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Student" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Employee" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Student.year: free text -> enum. Existing rows already only ever contain
-- one of the 5 labels above (enforced by postStudentSchema's zod z.enum),
-- so the cast is safe without a backfill.
ALTER TABLE "Student" ALTER COLUMN "year" TYPE "Year" USING ("year"::text::"Year");
