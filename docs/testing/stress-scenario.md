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
to stay within the five-uploads/minute budget. QR needs `ACTION_ID`. Boundary
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
