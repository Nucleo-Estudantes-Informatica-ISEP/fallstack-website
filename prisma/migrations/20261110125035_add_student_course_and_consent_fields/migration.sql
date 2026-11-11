-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "course" TEXT,
ADD COLUMN     "privacyPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
