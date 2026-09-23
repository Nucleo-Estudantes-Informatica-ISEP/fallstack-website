# Shared PostgreSQL and MinIO

Fallstack uses NEI shared PostgreSQL 16 and MinIO after each environment's
cutover. During migration, source Supabase remains live until verified retired.
See the private Fallstack cutover runbook for current environment status.

| Environment | Database / schema | MinIO buckets |
| --- | --- | --- |
| Development | `fallstack_dev` / `fallstack` | `fallstack-dev-avatars`, `fallstack-dev-cvs` |
| Production | `fallstack_prod` / `fallstack` | `fallstack-prod-avatars`, `fallstack-prod-cvs` |

Coolify Compose path: `/docker-compose.app.yml`. Both app and migrator join
external Docker network `gbheij1ljds8nrhfgdf9teeo`. The migrator runs before
the web service becomes healthy. PostgreSQL hostname is
`postgres-gbheij1ljds8nrhfgdf9teeo:5432`; MinIO endpoint is
`http://minio-gbheij1ljds8nrhfgdf9teeo:9000`. Neither service has a public
host port. Never expose S3 credentials to the browser.

Set `DATABASE_URL` to the environment's **runtime** identity and `DIRECT_URL`
to its **migration** identity, with `?schema=fallstack` on both. Compose passes
`DIRECT_URL` only to the migrator. Set `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_BUCKET_AVATARS`, and `S3_BUCKET_CVS` to that
environment's restricted identity and buckets. Preserve the existing OIDC,
email, JWT, Sentry and base URL variables. Remove the three old Supabase
runtime variables and `SUPABASE_NETWORK_NAME` after cutover.

The browser uploads through authenticated app routes. Server checks role,
upload size, MIME and file signature, then stores object through S3. Avatar
URLs are same-origin `/api/media/avatar/<id>` and intentionally public. CVs
are never public: `/api/students/<code>/cv/file` checks the existing student,
company or admin policy on every request. Admin list and download routes
require admin auth. The app's CSP needs only same-origin storage access.

Use `pnpm exec prisma migrate deploy` as the migrator. Keep the source
`_prisma_migrations` rows during app-only PostgreSQL restore. Do not import
Supabase `auth` or `storage` schemas. Do not run legacy `supabase/*.sql` jobs
against shared PostgreSQL: those reference Storage metadata, Vault, pg_net and
old `public` schema paths. Reconcile orphan objects separately with the S3 API
after reviewing candidates. Scheduled shared-service backups are a separate
requirement; migration dumps are one-time recovery points.
