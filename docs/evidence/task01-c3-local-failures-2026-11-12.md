# Local failure-load evidence — 2026-11-12 (#451)

Tested revision: `16691c3a48ff2ac8a52f113b875c335e4b684948` (PR #552).
[Machine-readable results](task01-c3-local-failures-2026-11-12.json) record phase
metrics, HTTP statuses, routing counts, action timestamps, source hashes and
SHA-256 hashes of the original artifacts.

## Environment and scope

The isolated Ubuntu/WSL Docker environment used the repository's
`docker-compose.local.yml`: PostgreSQL 16.15, authenticated Redis 7.4.12 with AOF,
MinIO `RELEASE.2025-10-15T17-29-55Z` with all three application buckets, the
migration job, the cleanup worker in dry-run mode, and two copies of the
production Docker image (Node 26.13.0). The migrator and bucket initializers
exited 0. Web, migrator and cleanup ran as `nextjs`; cleanup completed its
initial dry-run. No shared data or deployment was modified.

A local override removed web host ports, set `restart: "no"` for fault control,
scaled web to two copies, and exposed Traefik only at `127.0.0.1:14052`.
Traefik 3.5 used digest
`sha256:16acb89c6db341182970d6fdafece31303b0a380a8ed7aa51682e225229bf1d2`.
Its two upstreams were `fallstack-552-full-web-1:4000` and
`fallstack-552-full-web-2:4000`, with `/api/proxy-ready` health checks every five
seconds and a two-second timeout, matching the application deployment settings.
Access logs confirm both copies received baseline and recovery traffic. Only
the surviving copy received settled-fault traffic in the removal/drain runs;
both copies continued serving the Redis-outage run.

AuthNEI's real public `/debug/ready` endpoint returned 200. OIDC client values
were local placeholders: interactive login and authenticated user workflows
were not exercised by this rehearsal. This is local Docker evidence, not a
measurement of the shared Coolify staging deployment or production capacity.

## Workload and results

Each scenario ran separately with k6 2.3.0, ten VUs, the unchanged 150-second
workload, five-second request timeouts and redirects disabled. The orchestrator
used the first observed HTTP response as its clock reference, sent the fault at
30 seconds and restored the service at 90 seconds; exact timestamps are in the
JSON. All twelve thresholds passed in each run; every k6 process exited 0.

Counts and p95 values below are ordered baseline / settled fault / recovery.
Each of these phases had 100% expected-status checks and 0% unexpected HTTP
failures. Expected Redis readiness 503 responses are successful fault checks.

| Scenario          | Requests           | p95 (ms)              | Failed checks during injection / restoration |
| ----------------- | ------------------ | --------------------- | -------------------------------------------- |
| copy-removed      | 1168 / 1720 / 1764 | 12.70 / 17.02 / 3.41  | 30 / 0                                       |
| redis-unavailable | 1160 / 1720 / 1764 | 10.26 / 125.72 / 8.06 | 140 / 30                                     |
| copy-drained      | 1160 / 1752 / 1772 | 9.19 / 11.75 / 3.24   | 49 / 0                                       |

Transition failures remain visible and are not counted as steady-phase success.
They reflect proxy eviction and readiness changes/cache propagation within the
documented transition windows. No thresholds or transition windows were relaxed.

- **Copy removed:** SIGKILL stopped one copy with exit 137. The copy stayed down
  until restoration, while the survivor returned 200 on all four endpoints.
- **Redis unavailable:** the dedicated Redis container was stopped. Both web
  copies returned 503 from `/api/ready` and 200 from health, proxy-ready and
  schedule during the settled outage. Both recovered after Redis restarted.
- **Copy drained:** an exclusive lock on the disposable `ScheduleEvent` table
  held a cold English schedule request in flight. PostgreSQL confirmed a lock
  waiter before SIGTERM. The web shutdown log recorded `activeRequests: 1`;
  proxy-ready returned 503. Releasing the lock allowed the real request to
  finish with HTTP 200 and `Connection: close`. The process logged that all
  active requests finished, then exited 0 after its ten-second deregistration
  delay, without a drain timeout or forced kill. The second copy continued
  serving the load and the restored copy rejoined the proxy pool.

## Other validation

- `pnpm test --maxWorkers=2`: 161 files, 934 tests passed in one complete run
  with real disposable PostgreSQL and authenticated Redis.
- Failure-workload regression tests: 12 passed. Before the fix, five new tests
  failed, including the iteration beginning at 88 seconds whose readiness
  request starts after restoration at 90 seconds.
- Typecheck, production build, Prisma validation and migrations passed.
- Lint: zero errors; four pre-existing formatting warnings outside changed files.
- Docker builds for web, migrator and cleanup completed, and all services ran.
- Nine backup checks, Redis-probe regressions, singleton/scaling/release-order
  checks and the multi-process PostgreSQL pool/drain check passed.
- Final Chromium run against the rebuilt local image: nine tests passed across
  public health/assets, enforced CSP, staging redirect safety and guarded-route
  teardown. The new delayed-asset regression failed before the fixture fix.
- Local browser validation also exposed Zod's caught dynamic-code probe under
  strict CSP. Browser-only `jitless` configuration removed that violation without
  widening CSP; the full 934-test suite passed again after this change. The CSP
  test waits for late asset/prefetch requests before inspecting violations and
  navigating onward. These follow-up changes do not alter the load workload
  whose source hashes and original run revision are recorded above.
- Trivy 0.76.2 found zero high/critical OS-package vulnerabilities in the built
  web image (Alpine 3.24.4); this was the same scan scope as CI.

## Reproduction and evidence boundary

Use the operator timeline and assertions in
[the failure-load guide](../failure-load-scenarios.md). For local reproduction,
start the local Compose topology, add two web copies behind the health-checking
proxy described above, and run each scenario against the proxy:

```bash
E2E_BASE_URL=http://127.0.0.1:14052 \
STAGING_BASE_URL=http://127.0.0.1:14052 \
CONFIRM_NON_PRODUCTION=yes FAILURE_SCENARIO=copy-removed VUS=10 \
k6 run --out json=copy-removed-samples.json \
  --summary-export=copy-removed-summary.json tests/load/failure-scenarios.js
```

Repeat for `redis-unavailable` and `copy-drained`, restoring health between runs.
For the drain assertion, hold the cold schedule query briefly with a transaction
lock, confirm it is waiting, send SIGTERM and release the lock before the
application's two-second public-data deadline. Check both the HTTP result and
shutdown/proxy logs; a 200 response alone does not prove graceful draining.

The author's local rehearsal directory retains the orchestrator, Compose
settings, complete k6 samples/summaries, timeline and per-copy/Redis/proxy logs.
The JSON includes hashes for those artifacts. All three #451 scenarios were
reproduced in this isolated local topology. The issue remains open pending PR
review and integration. Do not interpret this report as an approval or evidence
of shared-staging or production deployment.
