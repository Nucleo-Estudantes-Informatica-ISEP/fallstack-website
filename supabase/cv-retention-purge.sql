-- Run manually in the hosted Supabase SQL editor after Student.cvUploadedAt/
-- cvPurgedAt exist (see prisma/migrations/20260809105934_add_student_cv_retention).
--
-- Twice-yearly retention purge for student CVs (#286): the event always
-- falls in November, so a calendar-fixed schedule (Nov 1 + May 1) resolves
-- the per-edition-vs-per-student clock question without inventing a new
-- "edition boundary" concept - neither is needed. cvUploadedAt (not
-- updatedAt, which any profile edit bumps) is what makes a fixed schedule
-- work: it's the CV-specific timestamp that tells a run which CVs are
-- genuinely older than 6 months.
--
-- This job only clears the DB reference (cv = NULL, cvPurgedAt = now()) on
-- Student - it does not touch storage.objects itself. The existing
-- orphaned-file GC job (storage-gc.sql) treats the newly-unreferenced
-- object as a normal orphan and deletes the bytes on its next run; see
-- cv-retention-purge-enable.sql for how the two schedules line up.
--
-- This installer does not enable the purge. Its final query is a required
-- dry run; inspect every returned row before running
-- cv-retention-purge-enable.sql.
--
-- cvUploadedAt/cvPurgedAt are Prisma DateTime columns, which map to
-- "timestamp without time zone" (Prisma normalizes to UTC before writing,
-- there's no zone stored). Comparisons/writes below use
-- `now() at time zone 'utc'` rather than bare `now()` (timestamptz) to
-- avoid an implicit, session-timezone-dependent cast against those naive
-- columns.

create or replace function public.cv_retention_purge_candidates()
returns table (
  id uuid,
  code text,
  cv text,
  "cvUploadedAt" timestamp
)
language sql
stable
security definer
set search_path = ''
as $$
  select students.id, students.code, students.cv, students."cvUploadedAt"
  from public."Student" as students
  where students.cv is not null
    and students."cvUploadedAt" < (now() at time zone 'utc') - interval '6 months'
  order by students."cvUploadedAt"
$$;

revoke all on function public.cv_retention_purge_candidates() from public;

create or replace function public.purge_expired_student_cvs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged_count integer;
begin
  with expired as (
    select id from public.cv_retention_purge_candidates()
  )
  update public."Student" as students
  set cv = null,
      "cvPurgedAt" = (now() at time zone 'utc')
  from expired
  where students.id = expired.id;

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function public.purge_expired_student_cvs() from public;

-- Required non-destructive dry run. Review every row before enabling the job.
select * from public.cv_retention_purge_candidates();
