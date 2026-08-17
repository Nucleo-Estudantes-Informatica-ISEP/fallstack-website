-- Run manually only after reviewing the dry-run result from
-- cv-retention-purge.sql. This enables irreversible clearing of expired
-- Student.cv references at 02:00 UTC on May 1 and Nov 1 each year.
--
-- 02:00 UTC is deliberately one hour ahead of storage-gc-enable.sql's daily
-- 03:00 UTC run, so the storage object this purge just orphaned is picked
-- up and deleted the same day instead of waiting on its own cadence -
-- addressing #286's "confirm the GC job runs soon enough after Nov 1/May 1"
-- step without adding a second trigger path.

select cron.schedule(
  'cv-retention-purge',
  '0 2 1 5,11 *',
  $job$select public.purge_expired_student_cvs();$job$
);
