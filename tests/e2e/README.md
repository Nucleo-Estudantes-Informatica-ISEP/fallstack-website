# Event test harness

Browser smoke and staging event-flow tests. Existing unit tests stay colocated
with the code they cover (`*.test.ts`/`*.test.tsx`, auto-discovered by Vitest).

## Pre-event staging readiness (#342)

Run **Staging event readiness** from GitHub Actions, selecting the revision that
matches the staging deployment (normally `dev`). This is a manually dispatched
check, not a deployment. GitHub exposes the dispatch button after this workflow
reaches the default branch; use the local command until then. Before first use,
create the GitHub `staging`
environment with these variables and secrets:

| Kind     | Name                                | Value                                                                    |
| -------- | ----------------------------------- | ------------------------------------------------------------------------ |
| Variable | `STAGING_BASE_URL`                  | Approved staging origin, e.g. `https://staging.example.org`              |
| Variable | `STAGING_ACTION_ID`                 | Existing synthetic staging action ID for public QR issuance              |
| Secret   | `STAGING_STUDENT_STORAGE_STATE`     | Complete Student Playwright storage-state JSON                           |
| Secret   | `STAGING_EMPLOYEE_STORAGE_STATE`    | Complete Employee storage-state JSON                                     |
| Secret   | `STAGING_ADMIN_STORAGE_STATE`       | Complete Admin storage-state JSON                                        |
| Secret   | `STAGING_SUPER_ADMIN_STORAGE_STATE` | Complete Super Admin storage-state JSON                                  |
| Secret   | `STAGING_STUDENT_COOKIES`           | Distinct synthetic student cookie pool; needed only for rate-limit probe |

Use only synthetic accounts described below. Refresh expired sessions. Protect
the environment's variables/secrets and limit who may dispatch against it.
The default run needs all four sessions; absent or expired credentials fail
rather than silently skipping role coverage.

The same check runs locally after installing dependencies, Chromium, and k6:

```bash
export STAGING_BASE_URL=https://staging.example.org
export E2E_BASE_URL="$STAGING_BASE_URL"
export CONFIRM_NON_PRODUCTION=yes
export ACTION_ID="synthetic-staging-action-id"
export E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json
export E2E_EMPLOYEE_STORAGE_STATE=tests/e2e/.staging-employee.json
export E2E_ADMIN_STORAGE_STATE=tests/e2e/.staging-admin.json
export E2E_SUPER_ADMIN_STORAGE_STATE=tests/e2e/.staging-super-admin.json
pnpm test:readiness
```

Layers run in order and stop at first failure:

1. **Configuration:** approved target, confirmation, action ID, four valid
   storage-state files, and optional rate-limit cookie pool.
2. **Health:** `/api/health` must return HTTP 200 and `{ "status": 200 }` within
   ten seconds, without redirecting. This is liveness; authenticated checks
   subsequently exercise the database and identity-dependent routes.
3. **Playwright:** existing Chromium health/home-CSP smoke, authenticated
   Student QR issuance, and Student/Employee/Admin/Super Admin role boundaries.
   One worker, no retries, no uploads. Required skipped coverage fails the run.
4. **k6 health and QR:** existing harness, one VU and five iterations per
   endpoint. Checks must all pass, request failures stay below 1%, and p95 stays
   below 750 ms. No event completion, uploads, or data writes.

Workflow options (all off by default), or matching local environment flags:

| Option       | Local flag                 | Additional checks / side effects                                                                                                              |
| ------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `mutations`  | `READINESS_MUTATIONS=yes`  | Existing Student → Employee scan/retry and Admin FAQ create/delete tests; synthetic saved relation/comment persists, FAQ cleaned in `finally` |
| `load`       | `READINESS_LOAD=yes`       | Existing health/QR ramp, ten VUs, three minutes per endpoint                                                                                  |
| `rate_limit` | `READINESS_RATE_LIMIT=yes` | Existing #287 CV boundary probe; uploads synthetic PDFs and asserts `429` beyond allowance; requires `STUDENT_COOKIES`                        |

The readiness command forces general Playwright upload flags off even if set
in your shell. Rate-limit uploads are a separate explicit opt-in. Allow a full
minute since those accounts' last CV upload before a boundary probe. Remove
unlinked CV objects through staging admin storage afterwards. Run the separate
normal-paced `upload-tickets` scenario when collecting full #287 evidence;
the default read-only check cannot prove upload rate-limit behavior.

All readiness runs and direct k6 scenarios require `E2E_BASE_URL` to equal
`STAGING_BASE_URL` exactly (a trailing slash is accepted), plus
`CONFIRM_NON_PRODUCTION=yes`. Remote targets must be HTTPS origins with a
`staging`, `stage`, or `stg` hostname label; production URLs, URL credentials,
paths, query strings, and fragments are rejected even with confirmation.
Loopback origins are allowed for local harness checks. Keep staging DNS pointed
at isolated staging services. Health and k6 refuse redirects.

One exit code and GitHub job status provide pass/fail. `test-results/readiness/`
contains `summary.md`, machine-readable `result.json`, per-layer logs, k6
summaries, and Playwright JSON/HTML reports plus failure traces/screenshots.
Layers after a failure are not run. The workflow uploads redacted text logs,
Playwright JSON, summaries, and k6 metrics from the `evidence/` subdirectory
even on failure, retains them for
three days, and removes session input files. Raw traces and HTML reports are
excluded from uploaded artifacts because they contain authenticated request
headers; local runs retain them for private triage. Setup or
runner cancellation failures appear in GitHub step logs; an interrupted run
is never a pass. Traces/reports can contain session data: restrict artifact
access and delete local reports/session files after triage.

For release gate #344, retain the run URL, deployed commit, deployment topology,
timestamp, selected opt-ins, and pass/fail result. Record rate-limiter evidence
in [the #287 report](../../docs/rate-limiter-load-validation.md); a successful
default smoke run alone does not establish event-load capacity.

## PostgreSQL integration tests (normal PRs)

`pnpm test:integration` runs the database invariants/concurrency suite and the
existing company-interest and interest-deletion suites against real PostgreSQL.
These tests are also auto-discovered by `pnpm test` and the normal PR CI job,
which already starts PostgreSQL 16 and applies `prisma migrate deploy`.
They do not need the app server, browser sessions, MinIO, or staging credentials.

Use a dedicated disposable local database, never a shared or production one:

```bash
docker run -d --name fallstack-test-postgres \
  -p 127.0.0.1:54329:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fallstack_test postgres:16
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/fallstack_test
export DIRECT_URL="$DATABASE_URL"
pnpm exec prisma migrate deploy
pnpm test:integration
```

Wait until `docker exec fallstack-test-postgres pg_isready -U postgres` succeeds
before applying migrations. No application seed is needed. The fixture helper
creates the required relationships with fixed values and unique identifiers,
and deletes only rows owned by each test, including after a failed assertion.
The ordering tests reserve day slots 339/340 and FAQ positions 339000–339003 in
this disposable database; do not run two copies of this suite against the same
database simultaneously.

Concurrency tests open two real transactions on separate connections and use a
barrier before writing, without sleeps or retries. They assert the number of
successful commits and the persisted state, without assuming which writer
wins. Deferred ordering constraints can reject one concurrent commit through
either a uniqueness conflict or PostgreSQL deadlock detection; both outcomes
must preserve the invariant. Separate swap and rollback cases verify that the
constraints are deferred and that an invalid final state cannot partially commit.

Coverage includes ActionCompletion inserts and idempotent upserts, company-wide
SavedStudent deduplication, booth completion through the save service,
Schedule/FAQ ordering collisions and swaps, transaction rollback after real
constraint errors, and company-interest persistence through the user service.
The existing interest suites additionally cover company isolation and cascades.

For a fast run without any PostgreSQL connection, use `pnpm test:unit`. It excludes
the three DB-backed files while retaining the existing unit and non-database
integration checks. `pnpm test` still runs everything and fails if the database
is missing; CI does not silently skip the database tests.

## Playwright

Install Chromium and WebKit once per machine. The default test run includes both
engines:

```bash
pnpm exec playwright install chromium webkit
```

Run the health smoke test against a local server:

```bash
pnpm test:e2e
```

Authenticated event tests use Playwright storage-state files captured from
synthetic staging-only Student, Employee, Admin, and Super Admin accounts. They
refuse to run unless `CONFIRM_NON_PRODUCTION=yes` is set. Never use production
accounts or a production URL. Storage-state files hold live staging sessions:
they are gitignored, but handle them like credentials and never share or commit
them.

Capture it by opening the staging login in Playwright, completing login, then
closing the browser:

```bash
pnpm exec playwright codegen \
  --save-storage=tests/e2e/.staging-student.json \
  https://staging.example.org/login
```

Repeat this command for `.staging-employee.json`, `.staging-admin.json`, and
`.staging-super-admin.json`, signing in as the matching synthetic account each
time. The Employee account must belong to a synthetic company. Before capturing
the Admin session, have a Super Admin create that synthetic account with the
`ADMIN` tier in the staging backoffice, then apply its NEI Global admin grant.
A freshly granted account without a preconfigured local tier defaults to
`SUPER_ADMIN`, so it cannot stand in for this account. The suite checks every
supplied session through `/api/auth/session` before mutating data.

Repeat capture whenever a session expires. Delete all four files immediately
after testing (`rm tests/e2e/.staging-*.json`; PowerShell:
`Remove-Item tests/e2e/.staging-*.json`).

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
pnpm test:e2e
```

Run the cross-role critical flow with all four synthetic accounts:

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
E2E_EMPLOYEE_STORAGE_STATE=tests/e2e/.staging-employee.json \
E2E_ADMIN_STORAGE_STATE=tests/e2e/.staging-admin.json \
E2E_SUPER_ADMIN_STORAGE_STATE=tests/e2e/.staging-super-admin.json \
pnpm test:e2e --project=chromium tests/e2e/playwright/event-role-flows.spec.ts
```

This flow uses real staging HTTP and database state. It issues a Student QR,
saves it through the Employee session, reads the saved row back through both
roles, and proves an exact retry returns `409` without overwriting or duplicating
the row. Reruns reuse that one synthetic Student/Employee-company relation and
replace only its `e2e-*` comment. Admin coverage creates one uniquely named
`e2e-*` FAQ and deletes it in `finally`. Do not point these accounts at real
event participants or companies. If a run is killed before cleanup, remove any
leftover `e2e-*` FAQ through the staging backoffice before the next run.

Set `E2E_ALLOW_UPLOADS=yes` to verify authenticated CV upload through the app.
Add `E2E_VERIFY_UPLOAD_LIMITS=yes` to check wrong MIME and over-10 MiB
rejections. These checks run in Chromium only and create an unlinked staging
object; delete it through the admin storage page after the run. Use staging only.

Playwright writes failure screenshots and traces under `test-results/`, plus an
HTML report under `playwright-report/` when that reporter is selected. Inspect a
trace with `pnpm exec playwright show-trace <trace.zip>` and an HTML report with
`pnpm exec playwright show-report`. These directories are gitignored; delete
them after triage because they can contain staging URLs, page data, and session
context.

## k6 load test

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) separately.
The script refuses to run without an explicit non-production confirmation.

```bash
CONFIRM_NON_PRODUCTION=yes \
STAGING_BASE_URL=https://staging.example.org \
E2E_BASE_URL=https://staging.example.org \
K6_PROFILE=peak K6_SCENARIO=qr ACTION_ID=<staging-action-id> \
pnpm test:load
```

Available scenarios:

Default `K6_PROFILE=smoke` bounds `health` and `qr` to one VU/five iterations.
Explicit `K6_PROFILE=peak` enables the existing ramping/boundary scenarios. Every
profile applies the staging target guard above, including direct `test:load`.

- `health` — safe liveness baseline.
- `qr` — public action QR issuance; requires `ACTION_ID`.
- `upload-tickets` — authenticated CV uploads at a normal, ramping pace;
  requires a comma-separated `STUDENT_COOKIES` pool from distinct student
  accounts. Exact duplicate cookie entries are rejected, and the script
  rejects settings that could exceed any account's five uploads/minute limit.
  These are live staging session cookies: avoid shell history, never share
  them, and run only on staging.
- `upload-tickets-boundary` — for each `STUDENT_COOKIES` entry, sends one
  priming upload, the remaining four just before reset, then five after reset
  and one more to confirm `429`. All accepted uploads must return `201`.
  `boundary_combined_allowed` includes the priming request; the close burst
  contains nine uploads. `boundary_elapsed_ms` times only that close burst.
  `RATE_LIMIT_MAX` (default 5) and `RATE_LIMIT_WINDOW_MS` (default 60000)
  must match `config.uploads.cv.rateLimit`. Run this
  scenario alongside `qr` (and optionally `upload-tickets`) in separate
  concurrent `pnpm test:load` invocations against the same target to get a
  realistic mixed-traffic picture rather than an isolated probe.

For a repeatable local route check without staging services, run
`pnpm exec vitest run tests/e2e/rateLimiterBoundary.test.ts`. It calls the real
CV route and limiter with six synthetic student identities; session lookup and
object storage are stubbed. This verifies route behavior, not k6 load or
deployment latency.
