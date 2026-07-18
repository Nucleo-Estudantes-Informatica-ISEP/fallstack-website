-- Run manually only after reviewing the dry-run result from storage-gc.sql.
-- This enables irreversible Storage API deletions at 03:00 UTC each day.

select cron.schedule(
  'storage-orphan-gc',
  '0 3 * * *',
  $job$select public.queue_orphaned_storage_gc();$job$
);
