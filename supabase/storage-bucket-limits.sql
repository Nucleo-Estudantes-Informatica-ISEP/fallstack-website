-- Run manually in the hosted Supabase SQL editor after creating the avatars
-- and cvs buckets. This keeps direct signed uploads constrained by Storage,
-- where the bytes are received. It intentionally does not modify public/private
-- access or Storage RLS policies.

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    raise exception 'Storage bucket "avatars" does not exist';
  end if;

  if not exists (select 1 from storage.buckets where id = 'cvs') then
    raise exception 'Storage bucket "cvs" does not exist';
  end if;
end
$$;

update storage.buckets
set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/png', 'image/jpeg']::text[]
where id = 'avatars';

update storage.buckets
set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf']::text[]
where id = 'cvs';

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('avatars', 'cvs')
order by id;
