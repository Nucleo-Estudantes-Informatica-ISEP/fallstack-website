CREATE TYPE "AttendancePeriod" AS ENUM ('MORNING', 'AFTERNOON');

CREATE TABLE "AttendanceCheckIn" (
    "id" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "period" "AttendancePeriod" NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" UUID NOT NULL,
    "scannedById" UUID,
    CONSTRAINT "AttendanceCheckIn_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AttendanceCheckIn_day_check" CHECK ("day" IN (1, 2)),
    CONSTRAINT "AttendanceCheckIn_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceCheckIn_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AttendanceCheckIn_day_period_studentId_key" ON "AttendanceCheckIn"("day", "period", "studentId");
CREATE INDEX "AttendanceCheckIn_studentId_idx" ON "AttendanceCheckIn"("studentId");

-- Preserve every historical activity record; import the earliest check-in in
-- each half-day using the captured activity start (before 14:00 = morning).
INSERT INTO "AttendanceCheckIn" ("id", "day", "period", "checkedInAt", "studentId", "scannedById")
SELECT DISTINCT ON ("sessionDay", "period", "studentId")
    "id", "sessionDay", "period", "checkedInAt", "studentId", "scannedById"
FROM (
    SELECT *, CASE WHEN "sessionStartTime" < '14:00' THEN 'MORNING' ELSE 'AFTERNOON' END::"AttendancePeriod" AS "period"
    FROM "SessionCheckIn" WHERE "sessionDay" IN (1, 2)
) AS legacy
ORDER BY "sessionDay", "period", "studentId", "checkedInAt", "id";
