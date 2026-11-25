# Event stress scenario

Decisions for the Fallstack 2026 capacity tests (#447, Task01-A).

## Targets

- 1,200 homepage users and 200 heavy users (QR scans, CV uploads, check-in).
- All arrive within 1 minute, about 20 homepage loads per second.
- 4 web copies behind the CDN. The capacity of 4 copies is an estimate until Task01-F measures it.

## Pass limits

- Speed: the slowest 5% of homepage loads under 0.75 s.
- Errors: under 1% for homepage and heavy users. Rate-limit responses (429) do not count.

## Uploads

- CV limit is 10 MB (PDF). Test with a realistic mix of sizes, including some at the limit.

## Above capacity

Users wait for their page. Worst case, all 1,200 arrive in the same second and the last user waits about 30 s. This is an accepted risk.

- CDN, proxy and Coolify timeouts must be at least 30 s.
- Revisit only if the heavy-user test (Task01-C2) fails.

## Heavy-user run (Task01-C2, #450)

`pnpm test:load:heavy` runs `tests/load/heavy-users.js` against staging. By
default 200 heavy users arrive within 1 minute, stay for 3 minutes, then leave
over 30 seconds. Each user owns one synthetic account, and no account is used by
more than one group:

| Group     | Default | Account            | Each visit                                                                                                    |
| --------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Dashboard | 40      | Company employee   | `/dashboard`, `/api/companies/history`, then downloads up to 2 saved students' CVs, every 10 s                |
| QR        | 140     | Student            | QR pass (`/api/qrcode`), optional action QR scan, one CV upload, attach, then download of that CV, every 15 s |
| Check-in  | 20      | NEI member (staff) | One session check-in by student code, every 3 s                                                               |

CV uploads cycle through 180 KiB, 450 KiB, 1.2 MiB, 3 MiB and exactly 10 MiB, so
one upload in five is at the limit. Each file is a valid PDF and the student's
download must return the same number of bytes.

Each upload follows the direct upload flow from #595, as the student app does:

1. `POST /api/storage/cv` with the file name, type and size. The five per
   minute limit applies here. The response is a signed storage form.
2. The PDF goes straight to that signed storage URL, without application
   cookies. The script refuses to send it unless the URL's origin is
   `CV_STORAGE_ORIGIN`.
3. `POST /api/storage/cv/finalize` validates the PDF and returns its id,
   retried while it answers 409, then the student attaches and downloads it.

### Before the run

- Staging only. The script refuses production and needs
  `CONFIRM_NON_PRODUCTION=yes` and `E2E_ALLOW_UPLOADS=yes`.
- Create the synthetic accounts and export their cookies as comma-separated
  lists: `DASHBOARD_EMPLOYEE_COOKIES`, `QR_STUDENT_COOKIES` and
  `CHECKIN_STAFF_COOKIES`. Put the QR students' codes in `QR_STUDENT_CODES`, in
  the same order as their cookies. Keep cookies out of shell history, logs and
  reports.
- Have every dashboard company save some students who already have a CV.
  Otherwise the dashboard downloads fail their check.
- Set `CHECKIN_SESSION_ID` to a schedule session that is live for the whole run,
  and set `CHECKIN_STUDENT_CODES` to the students to check in. Optionally set
  `ACTION_ID` to a live action and provide an administrator session in
  `ACTION_PRESENTER_COOKIE` so each QR student also scans its action QR
  once, on their first visit. A rerun with the same accounts finds the action
  already completed; that 400 is counted in
  `action_scan_already_completed_400` instead of failing.
- Leave at least a minute since the QR students' last CV upload.
- Confirm the staging CV bucket has room for about 7.5 GiB first. Each QR
  student uploads one CV every 15 s for up to 270 s, so 13 to 18 uploads
  averaging 2.96 MiB. With 140 students that is roughly 5.3 to 7.3 GiB per
  run. Each attach replaces the student's previous CV, and storage clean-up
  only reclaims unattached objects older than seven days, so the space stays
  used for a week after every run. Estimate it as
  `QR_USERS × (RAMP_SECONDS + HOLD_SECONDS + 30) / UPLOAD_INTERVAL_SECONDS × 2.96 MiB`,
  and lower `QR_USERS` or `HOLD_SECONDS` if the quota is short.
- Staging must have direct CV uploads configured (`S3_PUBLIC_ENDPOINT`);
  otherwise authorization answers 503. Set `CV_STORAGE_ORIGIN` to the origin of
  that public storage endpoint, for example
  `https://storage.staging.example.org`.
- The k6 machine needs about 3 GB of free memory. A local 200-user run against
  a mock server peaked at 1.5 GB: each upload builds its PDF in memory.

```bash
CONFIRM_NON_PRODUCTION=yes E2E_ALLOW_UPLOADS=yes \
STAGING_BASE_URL=https://staging.example.org E2E_BASE_URL=https://staging.example.org \
CV_STORAGE_ORIGIN=https://storage.staging.example.org \
CHECKIN_SESSION_ID=<live-session-id> \
pnpm test:load:heavy --summary-export=heavy-users.json
```

Change the mix with `DASHBOARD_USERS`, `QR_USERS` and `CHECKIN_USERS`, and the
timing with `RAMP_SECONDS`, `HOLD_SECONDS`, `UPLOAD_INTERVAL_SECONDS`,
`DASHBOARD_INTERVAL_SECONDS` and `CHECKIN_INTERVAL_SECONDS`. The script refuses
settings above five CV uploads per minute per student (an interval under 12 s)
or above the staff check-in limit.

### Reading the results

Expected responses are reported separately and do not count as errors:

- `cv_upload_rate_limited_429`: uploads refused by the five-per-minute limit.
  The pacing keeps students under the limit, so a high count means the limiter
  is stricter than configured.
- `checkin_duplicate_409`: students who were already checked in, because the
  code list repeats during the run.
- `cv_download_unavailable_404`: saved students without a CV.

Because those responses are not errors, the run also requires the CV workload
to have happened, for both CV sizes. `size` is `real` (180 KiB to 3 MiB) or
`near_limit` (exactly 10 MiB). The run fails if any of these counts is zero:

- `cv_upload_accepted{size:real}` and `cv_upload_accepted{size:near_limit}`:
  uploads that returned 201 with a file id.
- `cv_download_succeeded{group:qr,size:real}` and
  `cv_download_succeeded{group:qr,size:near_limit}`: students who downloaded
  the PDF they just uploaded, with the same number of bytes.
- `cv_download_succeeded{group:dashboard}`: dashboard downloads that returned a
  PDF.

A run where every upload gets 429, every CV lookup gets 404, or only the
10 MiB uploads are refused, therefore fails. A group set to 0 users, or
`DASHBOARD_DOWNLOADS_PER_VISIT=0`, drops its requirements.
`cv_upload_near_limit_accepted` still reports accepted 10 MiB uploads on its
own line.

`cv_upload_duration` (authorize, storage transfer and finalize together) and
`cv_download_duration` show file transfer times without a pass limit; the
`cv_direct_transfer` and `cv_finalize` request tags split the upload further.
The run also fails if more than 1% of requests error, more than 1% of checks
fail (a script error counts as a failed check), or the slowest 5% of
dashboard, history, QR pass, CV authorization, CV attach or check-in requests
take over 0.75 s. Every visit waits out its interval even after a script
error, so a failure never turns into a burst against the per-account limits.

Afterwards, remove the synthetic uploads and accounts through the supported
storage clean-up and admin procedures.

The [16 November 2026 staging run](../evidence/heavy-users-staging-2026-11-16.md)
reached 200 users and failed the performance/error limits; its raw summaries,
configuration and cleanup/restoration checks are retained with the report.

## Task01-F multi-copy runner

Run `pnpm test:load:capacity` from the repository root against isolated staging.
Verify and set the actual deployment count first: `CAPACITY_COPIES=2` or `3`.
The runner does not scale Coolify or prove routing; never relabel the same
unchanged deployment as both topologies. Inspect replica inventory, routing and
limits before each topology. On isolated staging only, explicitly add
`-f docker-compose.capacity.yml` after `-f docker-compose.app.yml` in the
deployment's Compose configuration to opt into 1 CPU / 768 MiB per web copy.
Override these test budgets with `CAPACITY_WEB_CPU_LIMIT` /
`CAPACITY_WEB_MEMORY_LIMIT` after validating host headroom for co-hosted AuthNEI.
The normal Coolify definition has no new resource limits; never include the
capacity override in production. This runner does not apply either file.

With staging URL and synthetic `STUDENT_COOKIES` already exported securely:

```sh
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
STAGING_BASE_URL=https://staging.example.org \
CAPACITY_COPIES=3 \
CAPACITY_CELLS=3c-homepage-1200 \
CAPACITY_RESULT_DIR=test-results/capacity-fresh-run \
pnpm test:load:capacity
```

A 30-second, two-visits/second read-only canary runs first; a failed canary
stops execution. `CAPACITY_CANARY=no` skips it when an unchanged deployment
already has valid canary evidence. Each selected cell writes a separate JSON
summary with p95/p99 and errors; existing cell summaries are never overwritten.
Session values remain in the inherited environment, outside process arguments.

Default cells are homepage concurrency at 80/160/200 VUs and the 1,200-arrival
target for the selected topology. Choose comma-separated `CAPACITY_CELLS` to
avoid redundant runs. The arrival target offers 20 visits/second for 60 seconds,
requires at least 1,200 completed iterations and zero dropped iterations, and
uses `TARGET_PREALLOCATED_VUS` (default 200 in the runner) as the worker budget.
Each iteration requests HTML, assets, public APIs and a session check. Without
cookies the target is guest-only; record visitor mix explicitly. The concurrency
scenario requires at least 40/80/100 distinct synthetic student sessions for
80/160/200 VUs. The runner trims entries, ignores empty entries and rejects
duplicates and undersized pools for every selected cell before the canary or
any k6 call. Upload cells also require nonempty, distinct sessions; boundary
probes use the trimmed nonempty session count as their VU count.
`HOMEPAGE_PATH` defaults to `/event/pt` to avoid the root language redirect.
Canary overrides `TARGET_RATE`, `TARGET_DURATION`, `TARGET_VISITS` and the worker
budget only for its own run; selected target cells retain the caller's settings.

Optional cells are `<copies>c-heavy-200`, `<copies>c-failure-boundary` and
`<copies>c-failure-qr`. Heavy currently means the existing CV-upload probe only,
not the complete scan/check-in/upload/attach/download target. It needs synthetic
cookies and `REQUEST_INTERVAL_SECONDS=12` or longer with 200 distinct accounts
to stay within the five-uploads/minute budget. Preflight rejects non-finite or
non-positive intervals and checks `ceil(200 / sessions) * (60 / interval) <= 5`
for every selected heavy cell before the canary or any earlier cell runs.
The runner uses Node.js (the project runtime) for the same numeric parsing as k6.
QR needs `ACTION_ID` and an administrator session in `ACTION_PRESENTER_COOKIE`. Boundary
probes check rate limiting; these probes do not themselves inject copy or
dependency failures. Kill/drain/Redis fault injection and the full heavy flow
remain outside this runner.

Run cells sequentially: overlapping traffic against the same deployment
changes offered load and invalidates isolated capacity comparisons. k6 can run
on a separate nearby generator with the same repository and private environment;
record generator CPU/memory and location. Running it on the application host
adds contention and must be reported. No host deployment or scheduler is added.

Retain UTC interval, source revision, CDN hostname/cache state, actual replica
count, verified CPU/memory limits, visitor mix, latency/errors and per-copy
CPU/memory/restart/OOM series from [the metrics runbook](../operations/capacity-metrics.md).
Resource collection and AuthNEI supervision require verified infrastructure;
this runner alone cannot establish capacity or complete #453.
