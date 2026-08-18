-- Normalize existing positions deterministically before enforcing uniqueness.
WITH ranked_schedule AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "day"
      ORDER BY "order", "startTime", "id"
    ) - 1 AS normalized_order
  FROM "ScheduleEvent"
)
UPDATE "ScheduleEvent" AS event
SET "order" = ranked_schedule.normalized_order
FROM ranked_schedule
WHERE event."id" = ranked_schedule."id";

WITH ranked_faq AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "order", "question", "id") - 1 AS normalized_order
  FROM "FaqEntry"
)
UPDATE "FaqEntry" AS entry
SET "order" = ranked_faq.normalized_order
FROM ranked_faq
WHERE entry."id" = ranked_faq."id";

-- Deferred constraints allow a transaction to swap two occupied positions.
-- They still reject a duplicate final state at commit, including concurrent writes.
ALTER TABLE "ScheduleEvent"
  ADD CONSTRAINT "ScheduleEvent_day_order_key"
  UNIQUE ("day", "order")
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "FaqEntry"
  ADD CONSTRAINT "FaqEntry_order_key"
  UNIQUE ("order")
  DEFERRABLE INITIALLY DEFERRED;
