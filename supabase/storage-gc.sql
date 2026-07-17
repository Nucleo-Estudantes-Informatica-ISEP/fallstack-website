-- Run manually in the hosted Supabase SQL editor after creating these Vault
-- secrets (Dashboard > Integrations > Vault):
--   storage_gc_project_url      = https://<project-ref>.supabase.co
--   storage_gc_service_role_key = the project's service-role key
--
-- storage.objects is metadata only. This job reads it for reconciliation, then
-- deletes through the Storage API so both the object and its metadata disappear.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.queue_orphaned_storage_gc()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  project_url text;
  service_role_key text;
  request_headers jsonb;
  queued_count integer := 0;
begin
  select decrypted_secret
  into strict project_url
  from vault.decrypted_secrets
  where name = 'storage_gc_project_url';

  select decrypted_secret
  into strict service_role_key
  from vault.decrypted_secrets
  where name = 'storage_gc_service_role_key';

  request_headers := jsonb_build_object(
    'apikey', service_role_key,
    'Authorization', 'Bearer ' || service_role_key
  );

  for candidate in
    select objects.bucket_id, objects.name
    from storage.objects as objects
    where objects.created_at < now() - interval '48 hours'
      and (
        (
          objects.bucket_id = 'avatars'
          and objects.name ~ '^distribution/avatar/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and not exists (
            select 1
            from public."Student" as students
            where students.avatar = replace(objects.name, 'distribution/avatar/', '')
              or students.avatar = objects.name
              or right(
                split_part(students.avatar, '?', 1),
                length('/avatars/' || objects.name)
              ) = '/avatars/' || objects.name
          )
        )
        or (
          objects.bucket_id = 'cvs'
          and objects.name ~ '^distribution/cv/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
          and not exists (
            select 1
            from public."Student" as students
            where students.cv = replace(
                replace(objects.name, 'distribution/cv/', ''),
                '.pdf',
                ''
              )
              or students.cv = objects.name
              or right(
                split_part(students.cv, '?', 1),
                length('/cvs/' || objects.name)
              ) = '/cvs/' || objects.name
          )
        )
      )
    order by objects.created_at
    -- ponytail: cap each run; raise it or run more often if backlog exceeds one day.
    limit 1000
  loop
    perform net.http_delete(
      url := rtrim(project_url, '/') || '/storage/v1/object/' ||
        candidate.bucket_id || '/' || candidate.name,
      headers := request_headers,
      timeout_milliseconds := 5000
    );
    queued_count := queued_count + 1;
  end loop;

  return queued_count;
end;
$$;

revoke all on function public.queue_orphaned_storage_gc() from public;

select cron.schedule(
  'storage-orphan-gc',
  '0 3 * * *',
  $job$select public.queue_orphaned_storage_gc();$job$
);
