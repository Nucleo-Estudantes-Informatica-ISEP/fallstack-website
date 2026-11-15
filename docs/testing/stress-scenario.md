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

## Task01-F multi-copy run

Run the target matrix against an isolated staging deployment. Set the web
service to two copies, then three copies, and keep the CDN URL in
`E2E_BASE_URL` (the staging URL must match it). Each web copy is capped at
`WEB_CPU_LIMIT` (default `1.0`) and `WEB_MEMORY_LIMIT` (default `768M`) by
`docker-compose.app.yml`; record the effective values because the login service
shares the host.

```sh
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
STAGING_BASE_URL=https://staging.example.org \
STUDENT_COOKIES='session=<synthetic-1>,session=<synthetic-2>,...' \
ACTION_ID=<staging-action-id> \
CAPACITY_RESULT_DIR=test-results/capacity-<utc> \
./tests/load/capacity-targets.sh
```

The runner produces one k6 summary JSON per topology and scenario. The JSON
contains p95 and p99 latency, request error rates and check results. The matrix
covers 80, 160 and 1,200 homepage users, 200 heavy users, and the upload
rate-limit and QR failure probes on both two-copy and three-copy deployments.
Run the failure probes while one copy is drained or stopped, and record the
expected degraded response separately; restore the copy before the next target.

Use `CAPACITY_CELLS` to rerun only selected cells, for example
`CAPACITY_CELLS=3c-homepage-1200` after a canary. The 1,200-user cell uses a
constant arrival rate of 20 homepage visits per second for 60 seconds, with
`TARGET_PREALLOCATED_VUS` controlling the k6 worker pool. Set
`TARGET_DURATION=30s`, a smaller `TARGET_RATE`, and a matching
`TARGET_VISITS` value for a short canary before a full cell.
`HOMEPAGE_PATH` defaults to `/event/pt` so a language redirect does not turn a
valid homepage run into a redirect failure.

For each run, retain the UTC interval, commit, CDN hostname, copy count, CPU and
memory limits, offered VUs, p95, p99, HTTP 4xx/5xx/aborted counts, and the
per-copy CPU, memory, restart and OOM series from Prometheus. The first copy
count where the 1,200-user or 200-user target exceeds the error/latency budget
is the measured capacity boundary. Do not infer it from configuration alone.
