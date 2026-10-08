# MinIO CV retention and orphan cleanup

The `storage-cleanup` service in `docker-compose.app.yml` replaces the retired
Supabase jobs. It uses the same environment-specific PostgreSQL runtime identity
and MinIO buckets as the web app. It requires no OIDC/JWT credentials or public port.
The migrator must finish before the worker starts. No `pg_cron`, Vault,
`storage.objects`, or SQL-only object deletion is involved.

## Policy and consistency

The worker runs once at startup, then daily at **03:00 UTC**. This replaces the
old May/November schedule: a CV expires when `cvUploadedAt` is strictly older
than six calendar months, with PostgreSQL's month-end clamping, regardless of
profile edits. Each pass detaches at most 1,000 expired references, keeps
`cvUploadedAt`, and sets `cvPurgedAt` for the existing profile notice. Missing
upload timestamps are preserved and reported as operator warnings; investigate
provenance rather than guessing an upload date.

Only UUID objects under `distribution/avatar/` and `distribution/cv/` are eligible,
and only when S3 `LastModified` is strictly older than **48 hours**. Unknown names,
missing timestamps, recent uploads, other prefixes and logo buckets are excluded.
Student CV/avatar, Company avatar, and Sponsor logo references all protect keys,
including inactive records. Recognition covers bare UUIDs, object keys, current
`/api/media/avatar/<uuid>` paths (relative or absolute), and migrated Supabase
bucket URLs with query strings. A CV still referenced by another fresh student
is retained after the expired student's reference is cleared.

A short PostgreSQL transaction locks the three reference tables, rechecks refs,
detaches expired CVs and records orphan keys in `StorageDeletion`. It commits
**before** any S3 deletion. Attachment triggers reject queued and completed keys,
including uploads whose existence check raced cleanup. Reads continue during
claiming; media writes can briefly wait. The lock wait is bounded at five seconds,
and the transaction at 30 seconds. Do not bypass these triggers or reuse an
object key. This is an event-scale full listing/reconciliation; paginate/stream
planning and use a per-key registry if bucket size or write contention grows.
See PostgreSQL's [table lock rules](https://www.postgresql.org/docs/16/explicit-locking.html).

S3 failures retain the queue row; successful deletes set `deletedAt`. A crash
between S3 deletion and DB acknowledgement leaves a pending row: the next run
retries the idempotent delete. Pending rows with the oldest attempt run first,
so repeated failures cannot starve new work. Up to 1,000 deletes are attempted
per pass. Concurrent workers may repeat an idempotent deletion; no correctness
assumption depends on only one worker running. Completed tombstones are kept to
prevent late reattachment. Never delete queue rows as routine cleanup.

Buckets must have **never-enabled versioning**: both `Enabled` and `Suspended`
fail the preflight, because a plain [DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html)
would leave historical bytes. Resolve version history/lifecycle separately
before enabling this worker; do not disable versioning to hide remaining versions.
All bucket listings and versioning checks finish before DB mutations. The MinIO
identity needs `s3:ListBucket`, `s3:GetBucketVersioning`, and `s3:DeleteObject` on
only its own avatar/CV buckets. Keep web's existing upload/download permissions.
Runtime DB identity needs SELECT/UPDATE on Student, Company and Sponsor (including table locks),
and SELECT/INSERT/UPDATE on StorageDeletion. Apply grants through the shared
stack's normal role management after migration if defaults do not cover new tables.

## Deploy and audit

1. Merge the reviewed PR into `dev`; let Coolify deploy `/docker-compose.app.yml`.
   Confirm migrator success, then `storage-cleanup` startup logs and health.
   Its default `STORAGE_CLEANUP_MODE=dry-run` schedules audit only.
2. Run a staging dry run with the deployed worker:

   ```bash
   docker compose exec storage-cleanup node --conditions=react-server --import tsx scripts/storage-cleanup.ts
   ```

   Or locally with dedicated development DB/MinIO credentials loaded in `.env`:

   ```bash
   pnpm storage:cleanup
   ```

   Manual runs remain dry even when the daemon's environment mode is `apply`.
   Review JSON `cv-would-detach`, `would-queue`, `would-retry` and `summary` records.
   Dry run changes neither Student rows, queue rows nor S3 objects.

3. On staging, validate synthetic fixtures: an expired CV, a CV exactly at the
   cutoff, a fresh shared CV, a referenced old avatar, an unreferenced old object,
   a recent unreferenced object, and an unknown filename. Compare before/after
   SQL rows and S3 HEAD responses. The unit/PostgreSQL regressions are repeatable:

   ```bash
   pnpm exec vitest run src/application/services/storageCleanupService.test.ts tests/e2e/storageCleanup.test.ts tests/e2e/storageCleanupDeployment.test.ts
   ```

   For live failure testing, use a disposable staging identity whose DeleteObject
   permission is denied (preserve ListBucket/GetBucketVersioning). Apply against
   synthetic staging objects only. Expect `delete-failed`, nonzero one-shot exit,
   `cv=null`/`cvPurgedAt` set, and `deletedAt=null` with error code/attempt count.
   Restore DeleteObject permission; the next apply retries and sets `deletedAt`.
   Never weaken production permissions for a test.

4. After reviewing candidates, set `STORAGE_CLEANUP_MODE=apply` in the staging
   Coolify resource and redeploy. An explicit manual apply is:

   ```bash
   pnpm storage:cleanup --apply
   ```

5. Promote reviewed `dev` to `main` through the release PR. Verify production's
   separate `fallstack_prod` DB and `fallstack-prod-*` buckets, first deploy in
   dry-run, review its audit, then enable `apply` and observe a successful run.
   Do not point either worker at the other environment's DB or buckets.

## Monitor and recover

Worker stdout is newline-delimited JSON with UTC timestamp and run UUID. Failures
use error names/codes, never raw SDK messages, URLs, credentials, student codes,
names or emails. Object keys are pseudonymous identifiers; restrict log access
and retention. Inspect Coolify Runtime Logs for `storage-cleanup`, not web logs.
Configure operators' existing container-health alerts: a failing run, failed
deletions, unknown upload ages, or no successful pass within 26 hours makes the
worker unhealthy. A dry-run success is healthy but its summary clearly says
`mode=dry-run`; health alone does not prove deletion is enabled. Failure leaves
the daemon alive to retry at the next daily pass. One-shot commands exit nonzero
on failure or unknown CV age.

In shared PostgreSQL, inspect the queue without student PII:

```sql
SELECT kind, count(*) AS pending, min("createdAt") AS oldest,
       max(attempts) AS max_attempts
FROM fallstack."StorageDeletion"
WHERE "deletedAt" IS NULL
GROUP BY kind;

SELECT kind, key, attempts, "lastAttemptAt", "lastError"
FROM fallstack."StorageDeletion"
WHERE "deletedAt" IS NULL
ORDER BY "lastAttemptAt" NULLS FIRST, "createdAt";

SELECT count(*) AS unknown_cv_age
FROM fallstack."Student"
WHERE cv IS NOT NULL AND "cvUploadedAt" IS NULL;
```

If a run fails, fix the permission/network/configuration error, dry-run again,
then rerun apply. If S3 succeeded but DB acknowledgement failed, retry is safe.
If backlog exceeds 1,000, rerun until it drains, checking summaries each pass.
Pause by switching the daemon to `dry-run` and redeploying; pending keys remain
unattachable. Stopping the service also pauses scheduling. Never revert the queue
migration while a worker can run. After deletion, restoration requires backup
bytes uploaded under a **new key** plus the normal profile upload flow; toggling
`cvPurgedAt` or deleting a tombstone cannot restore bytes. Coordinate restoration
and privacy obligations with operators rather than automatically restoring
expired CVs.

## Validation evidence — 2026-10-08

Coolify was inspected in Helium: development follows `dev`, production follows
`main`; both use `/docker-compose.app.yml` and separate DBs/buckets. Neither
currently runs this worker. The existing `fallstack_dev_v2` and
`fallstack_prod_v2` MinIO policies now also allow `s3:GetBucketVersioning` on only
their own avatar/CV buckets. Other permissions were preserved. Original policies
are backed up on the VPS under `/data/coolify/backups/storage-retention-389/`.

VPS dry runs used isolated copies of both development and production DBs, migrated
through the migrator command, with each environment's real MinIO identity/buckets:
zero candidates and zero mutations in both. A separate synthetic staging check on the same PostgreSQL/MinIO
stack used disposable DB/buckets and a clock advanced 49 hours (no object metadata
was altered): dry run found one expired CV and two orphan objects without changing
refs or bytes; a no-delete identity left both deletions pending with `AccessDenied`;
a retry deleted both objects, recorded two attempts, and preserved the referenced
fresh CV/avatar. Disposable resources and credentials were removed afterwards.

These checks do not enable retention on the live deployments. The reviewed
`dev` rollout and subsequent `dev` → `main` promotion still need the per-environment
audit and `apply` switch above.
