-- CreateTable
CREATE TABLE "_InterestToStudent" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_InterestToStudent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InterestToStudent_B_index"
ON "_InterestToStudent"("B");

-- AddForeignKey
ALTER TABLE "_InterestToStudent"
ADD CONSTRAINT "_InterestToStudent_A_fkey"
FOREIGN KEY ("A") REFERENCES "Interest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterestToStudent"
ADD CONSTRAINT "_InterestToStudent_B_fkey"
FOREIGN KEY ("B") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing student interests.
-- Student.id and User.id are the same by convention, so only copy
-- User interests belonging to users that have a Student row.
INSERT INTO "_InterestToStudent" ("A", "B")
SELECT old."A", old."B"
FROM "_InterestToUser" AS old
INNER JOIN "Student" AS student
  ON student."id" = old."B"
ON CONFLICT DO NOTHING;

-- Preserve current company interests from employee fan-out copies.
-- Every employee at a company was historically written with the same
-- interest set, so DISTINCT collapses the duplicated per-employee rows.
INSERT INTO "_CompanyToInterest" ("A", "B")
SELECT DISTINCT employee."companyId", old."A"
FROM "_InterestToUser" AS old
INNER JOIN "Employee" AS employee
  ON employee."id" = old."B"
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "_InterestToUser"
DROP CONSTRAINT "_InterestToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_InterestToUser"
DROP CONSTRAINT "_InterestToUser_B_fkey";

-- DropTable
DROP TABLE "_InterestToUser";
