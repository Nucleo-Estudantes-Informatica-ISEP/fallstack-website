# Deployment modes verification — 16 November 2026

Scope: issue #418, branch `feat/deployment-modes`; implementation commit
`72ff3178`, updated with upstream `9371efdd` in `46c8923c`. The final local
application checks cover that combined revision. This record distinguishes executed
checks from operational acceptance gates. No production deployment occurred.

## Executed

- Confirmed isolated PostgreSQL 16 on loopback port 55418, database
  `fallstack418`; applied all migrations and passed Prisma validation.
- Full application suite: 246 files passed, 3 skipped; 1,688 tests passed,
  27 skipped by existing integration prerequisites. No shared database used.
- Final affected tests: 12 passed across deployment builder, mode/date rules
  and event page. Both static modes built with invalid backend connection
  settings and no identity/storage credentials. Verified missing, invalid,
  elapsed and future dates, stale cache replacement and expired countdown.
- `pnpm dev` with isolated DB/test-only runtime configuration: GET `/event/pt`
  returned 200 and the shared Portuguese next-edition copy.
- Full lint passed with existing warnings; changed code lint passed without
  warnings. Typecheck passed. Clean production build passed all 53 pages.
- Served the generated artifact using the actual Nginx config locally and in
  a task-owned VPS container with `--network none`. Boundary smoke passed:
  landing works, cookie changes nothing, auth/student/company/admin/API/image
  paths return 404 and POST returns 405. Local smoke additionally checked
  stale `Next-Action` POSTs on every denied path. No application upstream exists.
- PREPARATION gateway with ephemeral test certificates: no client certificate
  returned 400; a certificate signed by the test staff CA returned 200 through
  an isolated Nginx fixture upstream. This proves the TLS boundary, not a real
  AuthNEI staff login. Merged Compose inspection confirmed direct web routing
  disabled and no host ports. Standard Compose validation omitted only the
  existing Coolify-specific `exclude_from_hc` metadata from a temporary copy.
- Static and retention Compose configurations passed `docker compose config`.
- Helium desktop visual check: readable landing, local brand images, generic
  next-edition state, no account/session/authentication controls. Task tab closed.
- VPS static process: single sample, 11.79 MiB, 0.00% CPU. This is footprint
  evidence only; no matched EVENT/OFF-SEASON savings measurement was performed.
- Removed task-owned VPS test container/files. Existing web clones, app,
  Redis, shared data, identity, backup and cleanup resources were preserved.

## Read-only operations inventory

Coolify `event:fallstack` has production and development environments.
Development contains `fallstack-web:dev`, two running clones and standalone
`fallstack:redis:dev`. The user confirmed the clones belong to active tasks.
The existing app was marked degraded with unapplied configuration changes;
none were saved or deployed by this task. Read-only router inspection also
confirmed `staging.fallstack.nei-isep.org` routes to all three resources; switching
that origin would divert active clone traffic even without stopping containers.

Observed persistent volume names (do not remove or rename):

| Service                                              | Volume                                   | Mount                      |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------- |
| Shared PostgreSQL                                    | `gbheij1ljds8nrhfgdf9teeo_postgres-data` | `/var/lib/postgresql/data` |
| Shared MinIO                                         | `gbheij1ljds8nrhfgdf9teeo_minio-data`    | `/data`                    |
| AuthNEI database resource `x13x0b0xscm6klv80nqpy4qa` | `x13x0b0xscm6klv80nqpy4qa_pg-data`       | `/var/lib/postgresql/data` |
| AuthNEI database resource `skoc4c8c4o4cwcos0gws4ckc` | `skoc4c8c4o4cwcos0gws4ckc_pg-data`       | `/var/lib/postgresql/data` |

Host `fallstack-backup.timer` was present, next run 17 November 02:15 UTC;
last run 16 November 02:15 UTC. Presence/run time does not prove backup contents
or successful restoration. `fallstack-replica-sync.timer` was also active;
coordinate its owner before any zero-replica transition, or reconciliation can
restart a deliberately stopped copy. No timer was disabled.

## Staging switch, real phone and rollback

The user explicitly authorized temporary redirection of
`staging.fallstack.nei-isep.org` while keeping every clone running. A task-owned
Nginx container overrode only that hostname with a higher-priority HTTPS route.
It joined its own internal network with the existing reverse proxy. Its own
network namespace additionally rejected new outbound connections; established
HTTP replies remained allowed. No shared host firewall or service was changed.

Public landing returned 200; session API returned 404; a Server Action POST
returned 405. The user installed the staging PWA before the switch and reported:
"Static page loads; old dynamic paths unavailable after reconnect" after being
asked to reopen without clearing data, try old deep links, launch offline and
reconnect. This is user-reported real-phone evidence. Device OS/browser and
separate offline screenshots were not supplied; no additional device result is
inferred.

All development schema table row counts/content fingerprints and all three
MinIO bucket metadata fingerprints matched before, during static delivery, and
after rollback. Metadata fingerprints include key, ETag, size and modification
time; no private record, object key or object contents were published. Rollback
removed the task container, its router and network connection; existing clones,
Redis, cleanup workers, replica reconciliation and shared services kept running.
Other active work redeployed the main app/clones during this window; this task
did not stop or redeploy them.

Staging returned the same pre-existing homepage 500 after rollback. Existing
logs identify schedule-data Zod validation as its cause. Restoring ingress does
not claim that the unrelated event-content error was fixed.

## Controlled PREPARATION boundary and serving footprint

A separate task-owned Next production instance used upstream image `9371efdd`,
synthetic credentials and an internal network without shared DB/MinIO/Redis or
identity access. It served `/event/pt` with the seasonal copy (200). The actual
staff gateway forwarded to that Next process: missing client certificate 400,
untrusted self-signed certificate 400, dedicated test staff certificate 200,
and admin API without an application session 401. The independent static
container continued serving 200 with no network. No real AuthNEI staff session
was fabricated or claimed. Private-network probes ran through the gateway's
network namespace; no public staff host or credential was created.

Seven samples over 190 seconds measured median Docker memory 158.0 MiB for the
Next baseline versus 6.309 MiB for static: 151.691 MiB serving-unit reduction.
The baseline process was stopped afterwards while static remained available.
This is not a whole-host or production-load claim. See the raw footprint JSON
and measured-savings section of the operations runbook for workload limits.

## Backup validation exception requested by the user

The backup timer remains enabled, but the latest service result is failure:
"MinIO snapshot exceeds source safety limit". Installed source/archive limits
remain 200,000,000 / 250,000,000 bytes. Read-only development storage inventory
reported 2,928,006,446 bytes across the three buckets. The last recorded verified
backup is 14 November 2026 02:15 UTC (157,292,352 encrypted bytes).

The user explicitly instructed: "dont change backup just bypass that requirement".
Backup changes and fresh backup/restore validation are therefore waived for this
task, not reported as passing. No safety guard, backup script, private config,
retained copy, object or fixture was changed. The 3 November historical restore
record remains available in the restore runbook with its original limitations;
it does not prove restoration of today's data. A fresh verified backup and an
approved non-production restore rehearsal remain operational risks before a
production OFF-SEASON cutover.

## Verification limits

Real AuthNEI staff sign-in, production activation and accepted recovery RPO/RTO
are not claimed. Existing application authorization tests remain relevant to
unchanged staff routes. The independent boundary is tested with a dedicated
client-certificate CA; no new production staff credential or identity-provider
permission was created. Shared-clone shutdown and host-wide memory savings are
not claimed because the user required those resources to remain running.

Final cleanup verified all `fallstack-418-*` VPS containers and both rehearsal
networks absent; temporary test certificates, synthetic env files and static
artifact copies were removed. Existing clone resources were preserved.

Final timestamp review added ISO fractional-second support (including values
produced by `Date.toISOString()`). Re-ran five affected unit/build tests, changed
code lint and typecheck successfully. The default generated HTML was byte-for-byte
identical to the previously verified static image; full app tests/build evidence
was reused for unchanged application code.

## PR 614 review follow-up

Changes based on head `2a098f815614a6d1ce335ffd0d374061852b5b33`:

- Retention unit now audits by default; the documented `apply.conf` drop-in is
  required to opt into deletion. No live timer or data was changed.
- `bash tests/e2e/preparation-boundary.sh` passed locally on macOS with Docker
  Compose v5.6.0 and Node v26.13.1. It renders the actual preparation overlay
  (removing only Coolify's `exclude_from_hc` extension for stock Compose), checks
  private routing/profile settings, validates the actual Nginx configuration,
  and probes a synthetic upstream: trusted staff client succeeds, missing and
  untrusted clients receive 400. Temporary containers, network and keys removed.
  CI now runs the same test. No shared DB, storage or identity service is used.
- `pnpm exec vitest run scripts/build-deployment.test.ts --maxWorkers=1`:
  three tests passed, including credential-free static builds.
- Changed Markdown/workflow Prettier checks and `git diff --check` passed.

Application sources, schema, dependencies and build configuration are unchanged;
application lint, full tests, typecheck, build and Prisma evidence recorded above
and in the PR is reused. No new app/dev-server, installed-PWA or live deployment
check was needed for these unit/CI/documentation changes. The test uses an
isolated synthetic upstream, not a real staff login. A new automatic Coolify
resource deployment was not performed: the existing staging ingress evidence
proves explicit proxy attachment only. The runbook now states the required
attachment/router setup and actual-hostname verification gate explicitly.

The pre-push hook additionally reran lint (0 errors, 25 existing warnings) and
typecheck successfully at `40a44a77`. Its initial full test attempt lacked a
local database and failed; that attempt was stopped. After migrating a dedicated
PostgreSQL 16 container, the full suite passed at the same revision:
246 files passed, 3 skipped; 1,688 tests passed, 27 skipped, using
`pnpm exec vitest run --maxWorkers=1` (182.63 seconds). The task-owned database
container and anonymous volume were removed afterwards. Build/Prisma validation
and live app/PWA evidence remain reused as described above.
