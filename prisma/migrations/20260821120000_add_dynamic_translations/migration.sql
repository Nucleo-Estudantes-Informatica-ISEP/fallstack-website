DROP INDEX "Interest_name_key";
DROP INDEX "FaqEntry_question_key";

ALTER TABLE "Interest"
ALTER COLUMN "name" TYPE JSONB USING jsonb_build_object('PT', "name");

ALTER TABLE "ScheduleEvent"
ALTER COLUMN "activity" TYPE JSONB USING jsonb_build_object('PT', "activity");

ALTER TABLE "FaqEntry"
ALTER COLUMN "question" TYPE JSONB USING jsonb_build_object('PT', "question"),
ALTER COLUMN "answer" TYPE JSONB USING jsonb_build_object('PT', "answer");
