ALTER TABLE "SessionCheckIn"
ADD COLUMN "sessionDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sessionStartTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sessionEndTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sessionActivity" JSONB NOT NULL DEFAULT '{}';

-- Existing attendance can only be backfilled from the currently stored schedule.
UPDATE "SessionCheckIn" AS c
SET "sessionDay" = s.day, "sessionStartTime" = s."startTime",
    "sessionEndTime" = s."endTime", "sessionActivity" = s.activity
FROM "ScheduleEvent" AS s WHERE s.id = c."sessionId";

CREATE FUNCTION snapshot_attendance_session() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT day, "startTime", "endTime", activity
        INTO STRICT NEW."sessionDay", NEW."sessionStartTime",
                    NEW."sessionEndTime", NEW."sessionActivity"
        FROM "ScheduleEvent" WHERE id = NEW."sessionId";
    ELSE
        NEW."sessionDay" := OLD."sessionDay";
        NEW."sessionStartTime" := OLD."sessionStartTime";
        NEW."sessionEndTime" := OLD."sessionEndTime";
        NEW."sessionActivity" := OLD."sessionActivity";
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER session_attendance_snapshot
BEFORE INSERT OR UPDATE ON "SessionCheckIn"
FOR EACH ROW EXECUTE FUNCTION snapshot_attendance_session();

CREATE INDEX "SessionCheckIn_sessionDay_idx" ON "SessionCheckIn"("sessionDay");
