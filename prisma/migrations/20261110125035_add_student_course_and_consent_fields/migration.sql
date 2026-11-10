-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_rankId_fkey";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "course" TEXT,
ADD COLUMN     "privacyPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "CompanyRank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
