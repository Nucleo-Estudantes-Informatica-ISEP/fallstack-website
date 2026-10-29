# MinIO CV retention and orphan cleanup

The `storage-cleanup` service in `docker-compose.app.yml` replaces the retired
Supabase jobs. It uses the same environment-specific PostgreSQL runtime identity
and MinIO buckets as the web app. It requires no OIDC/JWT credentials or public port.
The migrator must finish before the worker starts. Keep exactly one daemon per
environment; scale only web in the existing resource, following the
[release worker runbook](operations/release-workers.md). No `pg_cron`, Vault,
`storage.objects`, or SQL-only object deletion is involved.

## Policy and consistency

The worker runs once at startup, then daily at **03:00 UTC**. This replaces the
old May/November schedule: a CV expires when `cvUploadedAt` is strictly older
than six calendar months, with PostgreSQL's month-end clamping, regardless of
profile edits. Each pass detaches at most 1,000 expired references, keeps
`cvUploadedAt`, and sets `cvPurgedAt` for the existing profile notice. Missing
upload timestamps are preserved and reported as operator warnings; investigate
provenance rather than guessing an upload date.
Any unrecognized CV/avatar reference in Student, Company or Sponsor stops the
entire pass before reference changes, new claims or pending deletes. Both modes
emit `unknown-storage-reference` with a count. One-shot runs exit nonzero; the
daemon marks the pass failed. Investigate and
normalize these references before retrying; an unmapped reference cannot prove
that an object is orphaned. Known logo-bucket URLs and local `/assets/` paths are
outside the eligible buckets and do not block cleanup only when their paths
are unambiguous. Dot segments (`.`/`..`), percent-encoded paths, backslashes and
control characters before the query/fragment are rejected by attachment guards
and reference mapping. Existing aliases stop cleanup; operators must replace
them with a canonical media/asset path. Query/fragment encodings remain allowed.

Only UUID objects under `distribution/avatar/` and `distribution/cv/` are eligible,
and only when S3 `LastModified` is strictly older than **seven days**. Unknown names,
missing timestamps, recent uploads, other prefixes and logo buckets are excluded.
Student CV/avatar, Company avatar, and Sponsor logo references all protect keys,
including inactive records. Recognition covers bare UUIDs, object keys, current
`/api/media/avatar/<uuid>` paths (relative or absolute), and migrated Supabase
bucket URLs with query strings. A CV still referenced by another fresh student
is retained after the expired student's reference is cleared.
UUID comparison ignores case; queue rows and S3 deletes retain the exact listed
key because S3 object keys are case-sensitive. Both case variants remain protected
while referenced, and tombstones reject reattachment through either variant.

The seven-day grace begins at S3 `LastModified`, not DB attachment time. An upload
whose attachment is delayed beyond that window can be claimed as orphaned; its
attachment then fails and the user must upload again with a new key. This is an
bounded staging window; add explicit pending-upload tracking if delayed attachment becomes
a supported flow. Current uploads use `distribution/logo/` in `S3_BUCKET_LOGOS`
for company/sponsor logos, so that bucket is excluded from this task. Company
avatar and legacy Sponsor logo references into the avatars bucket still protect
those avatar keys. A logo key cannot collide with an eligible avatar/CV prefix.

A short PostgreSQL transaction locks the three reference tables, rechecks refs,
detaches expired CVs and records orphan keys in `StorageDeletion`. It commits
**before** any S3 deletion. Attachment triggers reject queued and completed keys,
including uploads whose existence check raced cleanup. Reads continue during
claiming; **all writes** to Student, Company and Sponsor can wait, including
profile updates unrelated to media. The lock wait is bounded at five seconds,
and the transaction at 30 seconds. Keep the daily run outside peak event traffic;
manual apply runs need the same scheduling care. Do not bypass these triggers
or reuse an object key. This is an event-scale full listing/reconciliation; paginate/stream
planning and use a per-key registry if bucket size or write contention grows.
See PostgreSQL's [table lock rules](https://www.postgresql.org/docs/16/explicit-locking.html).

S3 failures retain the queue row; successful deletes set `deletedAt`. A crash
between S3 deletion and DB acknowledgement leaves a pending row: the next run
retries the idempotent delete. Pending rows with the oldest attempt run first,
so repeated failures cannot starve new work. Up to 1,000 deletes are attempted
per pass. Invalid queue entries report `invalid-queue-entry` without raw keys;
apply records `InvalidCleanupQueueEntry`, stamps `quarantinedAt`, and continues with valid rows. Quarantined rows keep their tombstones but are excluded from later retry batches. Investigate them using the queue query below; never relabel a corrupt key as deleted or delete its tombstone.
Concurrent workers may repeat an idempotent deletion; no correctness
assumption depends on only one worker running. Completed tombstones are kept to
prevent late reattachment. The shared HTTP error boundary maps the guard's
queued/deleted-key rejection to 409 with a request to upload a new file, and its
ambiguous-path rejection to 400. Multipart upload still returns a fresh key (201);
attachment endpoints perform the guarded DB write. Unrelated DB errors remain 500. A `(kind, lower(key))` expression index keeps the
case-insensitive guard indexed as tombstones grow. Audit `would-queue` records
include only newly claimable keys; existing claims appear as retries. Never
delete queue rows as routine cleanup.
SIGTERM/SIGINT abort active S3 requests and stop subsequent deletes. A completed
delete is acknowledged before stopping; interrupted requests keep their claims
pending for idempotent retry. An in-progress DB transaction may still reach its
30-second timeout; forced container termination remains safely recoverable.

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
and retention. This CLI deliberately writes JSON directly instead of loading
the application logger/Sentry: its audit schema contains only validated object
keys, counts, run IDs and error names/codes, never raw exceptions or reference
URLs. Inspect Coolify Runtime Logs for `storage-cleanup`, not web logs.
The container heartbeat refreshes only after a pass with `failed === 0`. Failed deletes remove it immediately, so persistent AccessDenied makes the worker unhealthy. Missing upload ages alone remain warnings. No successful pass within 26 hours also makes the worker unhealthy. Configure log alerts for `delete-failed`,
`invalid-queue-entry`, `unknown-cv-upload-age`, and `unknown-storage-reference`,
and inspect pending queue rows; container health alone does not establish deletion success. A dry run is healthy
but its summary clearly says
`mode=dry-run`; health alone does not prove deletion is enabled. Failure leaves
the daemon alive to retry at the next daily pass. One-shot commands exit nonzero
on run failure or failed deletions. Missing upload ages alone are warnings;
unrecognized references fail the pass and make daemon health unhealthy.

In shared PostgreSQL, inspect the queue without student PII:

```sql
SELECT kind, count(*) AS pending, min("createdAt") AS oldest,
       max(attempts) AS max_attempts
FROM fallstack."StorageDeletion"
WHERE "deletedAt" IS NULL AND "quarantinedAt" IS NULL
GROUP BY kind;

SELECT kind, key, attempts, "lastAttemptAt", "lastError", "quarantinedAt"
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

Review follow-up on 2026-10-09 verified case-variant references against real local
PostgreSQL/MinIO: referenced avatar/CV objects survived, and an uppercase orphan
was deleted using its literal S3 key. The actual S3 SDK aborted stalled versioning,
listing, and deletion requests; the CLI daemon produced a heartbeat and exited
with status zero on SIGTERM. PostgreSQL regression tests also cover uppercase
legacy URL normalization, case-variant tombstone guards, unknown-kind rejection,
and retention of unrecognized CV references.

Review follow-up on 2026-10-12 verified a fresh migration, the expression index,
and all four unrecognized reference fields on PostgreSQL. An actual local
PostgreSQL/MinIO check preserved references, claims and bytes in both modes with
an unknown Sponsor reference; the CLI exited nonzero without logging its URL.
Normalizing it to a known logo route allowed a dry run followed by three
successful object deletes. Invalid queue rows also leave valid deletes runnable
and report only their error code/count.

Review follow-up on 2026-10-13 reproduced dot/encoded/backslash/control path
aliases and CRLF deployment-test failures before fixes. Fresh PostgreSQL tests
verify existing aliases stop both planning modes and cannot bypass any of the
four attachment guards. Actual local PostgreSQL/MinIO preserved the referenced
avatar and pending CV in both modes with a legacy alias; the CLI exited nonzero
without logging the path. Canonicalizing the reference retained the avatar and
allowed the pending CV delete to complete. Authenticated development API smoke
rejected an alias with 400 and no mutation, accepted a canonical logo path with
an encoded query with 200, and returned expected media 200/404 responses.

Review audit on 2026-10-14 ran the migration's exact reference mapping and
unknown-reference query on both live `fallstack_dev` and `fallstack_prod` databases,
using connection-local functions rolled back after the read. Both reported
`unknownReference: 0`, and Company/Sponsor logos had zero ambiguous paths
(including percent encodings and dot segments). No live rows, claims or objects
changed. This is current reference-audit evidence; repeat the full worker dry run
at deployment because new rows can arrive afterwards. Unrecognized external
logos still fail closed; an allowed render host alone cannot prove storage
ownership. Existing external logos can be replaced with canonical paths.

Claim lookups use batches of at most 1,000 keys. The worker intentionally retains
the builder stage's source/dev dependencies to run its TypeScript entrypoint;
image slimming is optional packaging work, not required for cleanup correctness.

The same day's full CLI dry runs used fresh media-only snapshots of live DB
references/ages (synthetic identities), migrated isolated PostgreSQL databases,
and each environment's real MinIO identity/buckets over an SSH tunnel. Development
reported zero candidates; production reported six orphan candidates. Both reported
zero expired references, unknown references, failed operations and deletions.
Snapshot reference rows and queues were unchanged. No live DB or S3 writes ran;
candidates still require the documented deployment-time operator audit.

## Review follow-up — 14 October

Uploads remain eligible for attachment for seven days after S3 LastModified;
this widens the previous 48-hour staging window. Beyond seven days the existing
409/upload-again behavior remains intentional. CV retention stays six months.

Planning now maps each non-null media reference once in a materialized CTE,
rather than performing separate global scans for expiry, unknown refs and live
keys. Global table locks remain necessary with the current reference model;
never split claim/recheck into unprotected transactions. The five-second lock
acquisition and thirty-second transaction bounds still apply. Benchmark a copy
with at least each environment's current Student/Company/Sponsor row counts
before apply; pause cleanup if its measured planning latency approaches the
transaction limit. A per-key registry is the upgrade if event volume outgrows this.

Unknown refs deliberately fail closed. Before deploy/apply, run this inside the
migrated environment's schema (restrict output access; references can contain PII):

```sql
WITH refs AS (
  SELECT 'Student.cv' AS field, id, 'cv' AS kind, cv AS reference FROM "Student"
  UNION ALL SELECT 'Student.avatar', id, 'avatar', avatar FROM "Student"
  UNION ALL SELECT 'Company.avatar', id, 'avatar', avatar FROM "Company"
  UNION ALL SELECT 'Sponsor.logo', id, 'avatar', logo FROM "Sponsor"
)
SELECT field, id, reference FROM refs WHERE reference IS NOT NULL
  AND storage_object_key(kind, reference) IS NULL
  AND NOT (kind = 'avatar' AND (
    storage_object_key('logo', reference) IS NOT NULL
    OR (reference LIKE '/assets/%' AND NOT storage_reference_path_is_ambiguous(reference))
  ));
```

For each row, verify the intended object through the normal media route/HEAD,
replace its reference with the canonical route or upload under a fresh key using
the normal authenticated admin/profile flow, then repeat this query and dry-run.
Never clear an unknown reference just to let deletion proceed. Percent-encoded
paths (including `%20`) are intentionally rejected: use canonical uploaded logo
routes; encoded query parameters remain supported.

`prisma/schema-extras.json` lists SQL-owned guards/index/CHECK and the existing
Company FK drift. CI verifies their presence after replay and rejects other
Prisma drift, including generated removal of the expression index. Prisma 6's
current diff ignores that unsupported index; the regression also checks its real
catalog entry. Preserve these objects when reviewing `prisma migrate dev` output.

The worker's DATABASE_URL must be a direct PostgreSQL or session connection,
never a transaction-mode pooler. Current Compose targets shared PostgreSQL
directly; DIRECT_URL mirrors that connection for Prisma. Verify the deployment
value before enabling apply. The existing dev/prod policies already grant
GetBucketVersioning on both respective buckets (see dated evidence); recheck
permissions with the deployed worker's dry run before apply.

Local PostgreSQL 16 benchmark used synthetic rows only: 10,000 Students (CV and
avatar), 10,000 Companies and 10,000 Sponsors, totaling 40,000 mapped references.
Dry-run planning took 12.024 seconds; apply planning took 5.084 seconds under
concurrent local build load, with no expired/orphan/unknown refs. All fixture rows
were removed. This is an event-scale capacity sample, not a measurement of live
production row counts; repeat with a current snapshot and production resources
before enabling apply.

A subsequent read-only audit observed development counts of 0 Students,
15 Companies and 7 Sponsors, and production counts of 8 Students, 15 Companies
and 7 Sponsors. A local fixture with those production row counts (synthetic
student CV/avatar refs, migration-seeded companies/sponsors) planned in 19 ms
for dry-run and 9 ms for apply. This measures matching row counts, not a live
write-lock benchmark or identical production reference contents. Its student
fixtures were removed. Both running apps' sanitized connection inspection
confirmed direct shared PostgreSQL on port 5432, with no PgBouncer flag; no
credentials or live rows were exposed or changed.

The actual CLI against a disposable local S3 HTTP fixture confirmed the seven-day
grace retains a 49-hour staged upload, invalid rows become quarantined,
AccessDenied removes the daemon heartbeat, retry deletes the old orphan, and a
successful pass restores heartbeat. SIGTERM exited zero and no raw private URL
appeared in audit output. This exercises the real AWS SDK/worker; it does not
replace the prior MinIO evidence or deployment-time permission audit.
