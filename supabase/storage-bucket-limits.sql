-- Run manually in every hosted Supabase project. Creates missing buckets and
-- enforces access, MIME, and size policy. Writes still require authenticated
-- app routes: public buckets only make object reads public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/png', 'image/jpeg']::text[]),
  ('cvs', 'cvs', false, 10 * 1024 * 1024, array['application/pdf']::text[]),
  ('logos', 'logos', true, 5 * 1024 * 1024, array['image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('avatars', 'cvs', 'logos')
order by id;
