# Legacy Supabase storage operations

These runbooks preserve the pre-MinIO procedures. They apply only to a source
Supabase project that still uses the `supabase/` SQL jobs. **Do not run them
against shared PostgreSQL or MinIO.** Current shared storage cleanup needs a
separately reviewed S3 process; see [shared data](SHARED_DATA.md).

## Orphaned-file garbage collection

Student media uploads are reconciled daily at 03:00 UTC. Objects are eligible
only when they are under the app-managed avatar/CV prefixes, are unreferenced by
`Student.avatar`/`Student.cv`, and are at least 48 hours old.

1. In Supabase Vault, create `storage_gc_project_url` with the project URL and
   `storage_gc_service_role_key` with the service-role key.
2. Run [`supabase/storage-gc.sql`](../supabase/storage-gc.sql) manually in the
   hosted Supabase SQL editor. Do not add the service-role key to the SQL file.
   Its final query is non-destructive and returns the exact candidate set.
3. Check every returned bucket/path against `Student.avatar`/`Student.cv`. The
   installer intentionally does not schedule deletion.
4. Only after confirming the dry run, run
   [`supabase/storage-gc-enable.sql`](../supabase/storage-gc-enable.sql) manually.
5. Confirm the job exists with:

   ```sql
   select jobid, schedule, command, active
   from cron.job
   where jobname = 'storage-orphan-gc';
   ```

The job reads `storage.objects` but deletes through the Storage API; direct SQL
deletion would remove only metadata and leave the billed blob behind. Failed API
deletions remain in `storage.objects`, so the next daily run retries them.

Monitor runs and asynchronous deletion failures after 03:00 UTC:

```sql
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'storage-orphan-gc')
order by start_time desc
limit 10;

select id, status_code, timed_out, error_msg, created
from net._http_response
where timed_out or error_msg is not null or status_code not between 200 and 299
order by created desc;

select bucket_id, count(*)
from public.storage_gc_candidates()
group by bucket_id;
```

`pg_net` responses expire after six hours by default, so inspect them soon after
the run. A candidate count that does not shrink indicates persistent failures.

## CV retention purge

Student CVs are purged twice a year, on May 1 and Nov 1 at 02:00 UTC, once
`Student.cvUploadedAt` is more than 6 months old. The job only clears the DB
reference (`cv = NULL`, `cvPurgedAt = now()`); the CV upload path stamps
`cvUploadedAt` and clears `cvPurgedAt` on every successful upload. A profile
banner tells the student their CV was removed whenever `cvPurgedAt` is set.

1. Run [`supabase/cv-retention-purge.sql`](../supabase/cv-retention-purge.sql)
   manually in the hosted Supabase SQL editor. Its final query is
   non-destructive and returns the exact candidate set.
2. Check every returned row against `Student.cv`/`Student.cvUploadedAt`. The
   installer intentionally does not schedule the purge.
3. Only after confirming the dry run, run
   [`supabase/cv-retention-purge-enable.sql`](../supabase/cv-retention-purge-enable.sql)
   manually.
4. Confirm the job exists with:

   ```sql
   select jobid, schedule, command, active
   from cron.job
   where jobname = 'cv-retention-purge';
   ```

The purge only clears the DB reference; it does not delete the storage object.
It runs at 02:00 UTC, one hour before the orphaned-file GC job's daily 03:00
UTC run (above), so the now-unreferenced CV object is deleted the same day
instead of waiting on its own cadence.
