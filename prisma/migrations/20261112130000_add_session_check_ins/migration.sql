-- CreateTable
CREATE TABLE "SessionCheckIn" (
    "id" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "scannedById" UUID NOT NULL,

    CONSTRAINT "SessionCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionCheckIn_sessionId_studentId_key"
ON "SessionCheckIn"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "SessionCheckIn_studentId_idx"
ON "SessionCheckIn"("studentId");

-- AlterTable
ALTER TABLE "SessionCheckIn"
ADD CONSTRAINT "SessionCheckIn_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ScheduleEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SessionCheckIn"
ADD CONSTRAINT "SessionCheckIn_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SessionCheckIn"
ADD CONSTRAINT "SessionCheckIn_scannedById_fkey"
FOREIGN KEY ("scannedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
