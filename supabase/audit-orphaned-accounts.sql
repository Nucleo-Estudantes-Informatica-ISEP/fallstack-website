-- Run manually in each environment's Supabase SQL editor. Read-only: this
-- reports account mismatches but intentionally does not delete either side.

select
  case
    when auth_user.id is null then 'application_without_auth'
    else 'auth_without_application'
  end as orphan_type,
  coalesce(auth_user.id, app_user.id) as id,
  coalesce(auth_user.email, app_user.email) as email
from auth.users as auth_user
full outer join public."User" as app_user on app_user.id = auth_user.id
where auth_user.id is null or app_user.id is null
order by orphan_type, email;
