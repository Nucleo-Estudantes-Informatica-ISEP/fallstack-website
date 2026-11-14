# Multi-copy capacity tests (#453)

Use `tests/load/capacity.js` only against disposable staging, behind the actual
health-checking proxy and CDN. The script shares the production-target guard
with the existing readiness harness and refuses redirects. It does not perform
OIDC sign-ins: provision synthetic application identities and valid sessions
before running it. AuthNEI's co-hosted CPU, memory and readiness must still be
recorded throughout the test.

[Measured outcomes and evidence](../evidence/task01-f-capacity-2026-11-14.md)
record both passing and failing cases. Running the matrix does not imply that
the deployment passed the event targets.

## Workloads

- `homepage-target`: 20 complete HTTP-model visits start each second for 60
  seconds, representing the agreed 1,200 arrivals within one minute. Half are
  guests; half use distinct synthetic Student sessions. Each visit requests
  HTML, discovered same-origin scripts/styles/images, the CSS background, four
  public APIs and its session endpoint. This does not execute JavaScript or
  model browser caches. Record both HTML response latency and the complete
  modeled visit duration. For comparison with the existing readiness harness, the speed gate is
  HTML p95 below 750 ms; the full modeled visit duration is retained
  separately and is not a browser page-load measurement.
- `homepage-concurrency`: ramp to `VUS` over 60 seconds, sustain for 120 seconds,
  and pause one second between visits. This is repeated traffic from concurrent
  users, not the 1,200 one-time arrivals. Run 80 VUs on two copies, and 160/200
  VUs through the CDN. For three-copy saturation, start below the failing load
  and increase until a passing/failing interval is established.
- `heavy`: ramp distinct Student/Employee pairs over 60 seconds and sustain
  for 120 seconds. Every pair reads the company dashboard and student profile,
  obtains a student QR, scans it once at the booth and completes one live
  action check-in. Repeated work uploads a CV, attaches it, downloads it as the
  authorized Employee and reads Student history. Each upload is followed by
  at least 20 seconds of pacing, below five uploads per minute per Student.
  10% use the 10 MiB limit; remaining VUs use 256 KiB or 1 MiB synthetic PDFs.
  Heavy runs require all first scans/check-ins and at least one verified
  near-limit CV round trip, as well as the agreed under-1% error gate; latency is recorded without
  inventing a separate heavy-user latency requirement.

All workloads record p95 and p99. HTTP 429s are counted separately and excluded
from the unexpected-error rate. A 429 cannot satisfy a dependent upload/scan
step; report actual operation counts, including all 200 first scans/check-ins,
so a throttled or truncated run cannot be reported as complete. Keep HTTP
errors, failed body checks and dropped arrivals visible even when another
threshold passes. Arrival counts can exceed 1,200 by one at the k6 scheduling
boundary; the gate requires at least 1,200 completed visits and zero drops.

## Preparation

1. Record revision/image digest, event-host inventory, CPU count, memory/swap
   pressure and UTC timestamps. Run one load generator/workload at a time.
2. Use two and three identical web copies, each with an enforced CPU quota and
   memory limit. Verify actual `docker inspect` values, not only Compose text.
   Reserve measured headroom for AuthNEI, the proxy, DB, Redis and storage.
   Keep migrations and cleanup singleton. Record Prisma pools separately.
3. Isolate test PostgreSQL, Redis, MinIO/buckets and credentials from shared
   data. Use the repository's local Compose topology with deployed immutable
   images, unpublished dependency ports, and an operator-controlled proxy
   route to the web copies. Keep `/api/proxy-ready` health checks, five-second
   intervals, two-second timeouts and normal compression. Do not change
   production routing or stop shared services during fault injection.
4. Prepare a private JSON array in a mode-0600 file. Supply 600 distinct Student
   sessions/codes for the target; supply one distinct Employee session per
   heavy VU, with company access to its paired Student after the booth scan:

   ```json
   [
     {
       "code": "Q00000",
       "studentCookie": "@Fallstack26:auth=<synthetic-session>",
       "employeeCookie": "@Fallstack26:auth=<synthetic-session>"
     }
   ]
   ```

   Set `CAPACITY_ACCOUNTS` to its absolute path. These must be actual distinct
   application users; unique cookie strings alone do not prove distinct users.
   Never commit credentials, cookies or account files. Initially no paired
   Student may be saved by its Employee's company or have completed `ACTION_ID`.
   Reset only this disposable database's interaction rows between heavy runs.

5. Set `CV_SMALL`, `CV_MEDIUM` and `CV_LARGE` to valid synthetic PDF files of
   262,144, 1,048,576 and 10,485,760 bytes. They must contain no real personal
   data. Set `ACTION_ID` to a live disposable action and
   `E2E_ALLOW_UPLOADS=yes` for heavy work. The script does not call Google Wallet.
6. Verify TLS without disabling certificate validation, redirects, all expected
   `x-instance-id` values, real sessions, one entire heavy iteration and CV
   bytes. Confirm `cf-ray`/`cf-cache-status` for CDN traffic, including static
   HITs and the exact public HTML allowlist. Warm-up and cold-cache runs must be distinguished.

## Run and retain evidence

The homepage workload checks the uncached `/` language redirect explicitly,
then requests `/event/pt` or `/event/en`; automatic redirects remain disabled.
Language documents share public HTML even with synthetic session cookies; the
private session API is measured separately. Apply the narrow staging cache rule
in [the cache runbook](../operations/public-data-cache.md) and verify HITs and
RSC/authentication bypasses before describing a run as CDN HTML caching.

With the private environment loaded, run each matrix cell separately:

```bash
export E2E_BASE_URL=https://staging-fallstack.nei-isep.org
export STAGING_BASE_URL="$E2E_BASE_URL"
export CONFIRM_NON_PRODUCTION=yes
CAPACITY_WORKLOAD=homepage-target VUS=200 \
  k6 run --out json=target-samples.json --summary-export=target-summary.json tests/load/capacity.js
CAPACITY_WORKLOAD=heavy VUS=200 \
  k6 run --out json=heavy-samples.json --summary-export=heavy-summary.json tests/load/capacity.js
CAPACITY_WORKLOAD=homepage-concurrency VUS=80 \
  k6 run --out json=concurrency-samples.json --summary-export=concurrency-summary.json tests/load/capacity.js
```

`VUS` preallocates target workers; it is the user target only for concurrency
and heavy workloads. Increase target workers before rerunning a dropped run;
never count omitted arrivals as successful users. A failed target is a valid
measurement, not evidence that the deployment can serve the target.

In the same UTC intervals, retain per-copy cgroup CPU usage/throttling,
RAM/current/peak/limit, swap, restarts and OOM counters; host CPU and swap
activity; dependency usage; and AuthNEI readiness/latency. Use
[the metrics runbook](../operations/capacity-metrics.md) or a private host-side
cgroup sampler. Record sampler gaps and generator limitations. HTTP samples
omit URL tags to avoid storing action tokens in paths; scrub console error logs
before publication because k6 can still log a failing request URL.

Run all three [failure scenarios](../failure-load-scenarios.md) with actual
fault injection and restoration. Keep routing and shutdown evidence for a
killed copy, drained copy and isolated Redis outage. Do not substitute mock
regression tests or an earlier rehearsal for the measured topology.

Publish exact outcomes, operation counts, latency/error/resource summaries,
source/artifact hashes and limitations. Restore staging routing, stop only
task-owned processes/containers, and remove private synthetic data/credentials
when no longer needed. Keep the sanitized evidence used for the report.
