-- DropForeignKey
ALTER TABLE "ActionCompletion" DROP CONSTRAINT "ActionCompletion_studentId_fkey";

-- AddForeignKey
ALTER TABLE "ActionCompletion" ADD CONSTRAINT "ActionCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
