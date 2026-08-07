-- Run manually in each environment's Supabase SQL editor. Read-only: this
-- reports account mismatches but intentionally does not delete either side.

-- Supabase Auth identities with no application account.
select auth_user.id, auth_user.email
from auth.users as auth_user
left join public."User" as app_user on app_user.id = auth_user.id
where app_user.id is null
order by auth_user.email;

-- Application accounts with no Supabase Auth identity.
select app_user.id, app_user.email
from public."User" as app_user
left join auth.users as auth_user on auth_user.id = app_user.id
where auth_user.id is null
order by app_user.email;
