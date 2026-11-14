# Multi-copy capacity measurements — 14 November 2026 (#453)

Application revision: `2b8ea5c623928f537fbb5c9253911f274cd10469`.
All tested web copies used immutable image
`sha256:edf6999151e02fae937beeb6a2bc4cb644f42c15588103ff371207311b750a8b`.
The [workload and reproduction guide](../testing/capacity-targets.md) defines
arrivals, concurrency, heavy operations and pass limits separately.

## Environment

Tests ran on the actual six-vCPU / 11,671-MiB event VPS, alongside the existing
production/development AuthNEI services and other co-hosted applications. The
load generator was k6 2.3.0 on an external macOS arm64 machine over Wi-Fi.
One workload ran at a time. This was an isolated staging deployment on the
event host, not production traffic or a change to production copy counts.

The task-owned `capacity453` Compose project reused
`docker-compose.local.yml` with the already-built deployment images. It had
three identical web containers; each routed copy was capped at **1 CPU and
768 MiB**, verified with Docker inspect and cgroup samples. The two-copy cases
routed to copies 1 and 2 only; copy 3 remained idle and is included in host
resource accounting. Existing shared-staging copies also remained idle.

PostgreSQL 16, authenticated Redis 7.4.12 and the deployment's MinIO image ran in
separate task-owned containers and volumes with no published dependency ports.
The migrator ran once; cleanup had one dry-run owner. Web pools retained three
request connections plus one readiness connection per process. No application
query or destructive test targeted shared PostgreSQL, Redis or MinIO data.

Fixtures contained 600 distinct Student application identities, 200 distinct
Employee identities spread over ten synthetic companies, one live check-in
action, and public rows installed by the normal migrations. Synthetic signed
sessions used a new isolated `AUTH_SECRET`; they did not mint or modify real
AuthNEI identities. PDF fixtures contained a readable one-page synthetic CV,
with byte sizes 262,144, 1,048,576 and 10,485,760. `pdfinfo`/`pdftotext` validated
the final fixtures. Near-limit bodies were assigned to every tenth heavy VU.

The existing Traefik 3.7 proxy routed both staging hostnames to the isolated
copies, with `/api/proxy-ready` checks every five seconds, two-second probe
timeouts, and normal gzip compression. Every HTML/API response's opaque copy
ID was recorded; the data confirms all routed copies received traffic.

`staging.fallstack.nei-isep.org` was DNS-only through an existing wildcard.
Cloudflare Universal SSL did not cover that nested hostname. A single explicit
proxied A record, **`staging-fallstack.nei-isep.org`**, was therefore added with
the same origin IP and a valid origin certificate. Tests kept strict TLS
validation. `cf-ray`, uncached HTML (`DYNAMIC`) and static asset `HIT` samples
establish the CDN path. No zone-wide TLS, security or cache setting was changed.

## Measurement boundaries

The 1,200 target means **20 new modeled visits per second for 60 seconds**,
not 1,200 simultaneous looping VUs. Half the visits are authenticated. A visit
loads HTML, discovered same-origin assets, the CSS background, four public
APIs and the session endpoint. For comparison with the existing readiness harness, the 750-ms gate is
reported for HTML p95; the complete HTTP journey is also recorded. Neither
HTML nor complete-journey p95 passed 750 ms at the required target loads. The model executes no
JavaScript and has no browser cache. The immutable image was built for the
original staging hostname; the HTTP workload addresses the modeled resources
through the tested CDN alias explicitly.

Concurrency cases ramp over 60 seconds and sustain for 120 seconds, with a
one-second pause between repeated visits. Heavy cases use the same ramp/hold
and at least 20 seconds between uploads. Every heavy VU attempts its first
booth scan and action check-in once; later loops exercise dashboard/profile,
QR generation, CV upload/attach/authorized download and Student history.
Counters and database observations distinguish actual operations from active
VUs. HTTP 429s are separate from unexpected errors; they cannot establish a
successful required scan, check-in or near-limit CV round trip.

The first exploratory origin target omitted proxy compression and ran with
80 target workers, so it is not an apples-to-apples CDN comparison. Exploratory
runs also exposed overly strict equality on the arrival count (k6 scheduled
1,201 visits once), a PDF stream-length metadata error, and the need for binary
CV byte checks and explicit mandatory-operation counters. The final harness
and validated-fixture runs correct those measurement issues. Original outcomes
remain in the JSON and are not silently presented as successful final runs.

Storage initially had a 0.5-CPU / 256-MiB test budget. Its resource samples
showed throttling, so heavy work was repeated with a 1-CPU / 1-GiB storage
budget and unchanged web limits. The two-copy headroom run's initial ramp
includes the increase from 768 MiB to 1 GiB; the full 200-user hold uses 1 GiB.
PostgreSQL/Redis/cleanup retained their separate 0.5-CPU / 256-MiB budgets.
These are measured staging budgets, not approved production resource settings.

A private host sampler recorded per-container cgroup CPU/throttling, sampled
RAM, enforced limits, restarts/OOM state, host memory/swap activity and AuthNEI
readiness. PostgreSQL connection/deadlock/rollback samples were added for the
later runs. The JSON records sample counts and gaps. Memory maxima are sampled
current usage, not a promise that no shorter spike occurred. Generator RSS/CPU
samples cover the later sweep/heavy/failure runs; earlier runs have no such
sample series. Network and CDN variability remain part of these end-to-end
measurements, so the boundary is specific to this topology, workload and client.

Both AuthNEI origins returned private readiness 200 during the monitored
intervals. The existing public production AuthNEI probe returned 403 through
its existing Cloudflare path, including the baseline; that is recorded rather
than represented as successful public login. Interactive OIDC login, new-user
registration, Google Wallet and real-device browser behavior were outside this
load measurement. This report does not approve those release flows.

## Target and concurrency results

Latency values are seconds; errors count unexpected HTTP outcomes with 429
excluded. Each table row represents a separate run. The JSON retains exact UTC
intervals, source hashes, operation/status counts, copy/cache counts, full
metrics and resource summaries.

| Complete arrival run | Completed visits | Dropped | HTML p95 / p99 | Unexpected errors |
| -------------------- | ---------------: | ------: | -------------- | ----------------: |
| 2 copies, CDN        |             1201 |       0 | 3.022 / 3.425  |           0.0023% |
| 3 copies, warm CDN   |             1200 |       0 | 0.967 / 1.469  |           0.0000% |

Both complete arrival runs missed the 0.750-s HTML p95 limit. The two-copy
run delivered one extra visit at the scheduling boundary; its original
`count==1200` gate was too strict. The later `count>=1200` gate preserves the
actual 1,200-arrival requirement.

| Concurrent workload     | Users | HTML p95 / p99 | Unexpected errors |
| ----------------------- | ----: | -------------- | ----------------: |
| 2 copies, direct origin |    80 | 6.261 / 6.986  |           0.0000% |
| 2 copies, CDN           |    80 | 2.233 / 3.061  |           0.0071% |
| 3 copies, CDN           |    10 | 0.306 / 0.433  |           0.0000% |
| 3 copies, CDN           |    40 | 0.691 / 0.991  |           0.0000% |
| 3 copies, CDN           |    80 | 1.629 / 2.304  |           0.0008% |
| 3 copies, CDN           |   120 | 2.553 / 3.430  |           0.0000% |
| 3 copies, CDN           |   160 | 3.798 / 4.478  |           0.0000% |
| 3 copies, CDN           |   200 | 5.779 / 8.668  |           0.0000% |

An additional two-copy CDN arrival repeat completed **956** visits and dropped
**245** scheduled arrivals after reaching its 200-worker ceiling. HTML p95/p99
was 12.554/20.163 s and unexpected HTTP errors were 0.1951%. This is an
overload observation, not another complete 1,200-visit result; it does not
replace the earlier complete two-copy run. Dropped load was never counted as
successful traffic.

The three-copy speed boundary for this repeated-visit workload lies **above
40 and at or below 80 concurrent users**. At 160/200 users the copies approached
their CPU quotas. Low HTTP error rates did not make those runs pass the speed
gate. These are observed end-to-end bounds, not an intrinsic Next.js limit or
a guarantee for another client, dataset, host load or resource budget.

## Heavy users and CV boundary

| Final storage-headroom run | Users | HTTP p95 / p99 | Unexpected errors | First booth scans / check-ins | 10-MiB round trips |
| -------------------------- | ----: | -------------- | ----------------: | ----------------------------- | -----------------: |
| 2 copies, CDN              |   200 | 6.988 / 12.735 |             4.70% | 200 / 200                     |                  0 |
| 3 copies, CDN              |   200 | 3.602 / 5.841  |             1.54% | 200 / 200                     |                  0 |

Both heavy runs failed the under-1% error gate and the required large-CV
completion gate. All 200 first scans/check-ins succeeded; actual database
counts after the final run were 800 Users, 600 Students, 200 Employees,
200 saved Students, 200 check-ins and 180 Students with attached CVs. The JSON
records the separate 400/503 and any network-failure counts by operation. No
429 responses occurred in the final heavy runs.

The idle boundary diagnostic confirmed a separate upload defect:

| Valid PDF file bytes | Multipart body bytes | Direct-origin response                       |
| -------------------: | -------------------: | -------------------------------------------- |
|           10,484,736 |           10,484,889 | 201: uploaded                                |
|           10,485,760 |           10,485,913 | 400: {"error":"Incomplete multipart upload"} |

The installed Next.js 15.5.29 middleware body-clone buffer defaults to
10,485,760 bytes. The application allows a file of that size plus multipart
overhead, but the middleware truncates the larger multipart body first. The
web logs reported the 10-MB body-buffer limit; the exact-limit request failed
with `Incomplete multipart upload` even without load. A valid PDF just 1 KiB
smaller uploaded successfully. This issue was measured and remains unfixed by
this testing contribution.

The first separate Python diagnostic through Cloudflare received 403/error
1010, so it was repeated directly at the staging origin. That probe rejection
is not represented as an application upload error or silently removed from
the record; no Cloudflare security setting was weakened. k6 CDN outcomes are
recorded independently.

## Fault injection

All three scenarios used the same event-host image, two routed copies, 10 VUs
and the existing 150-second workload. Faults were injected at approximately
30 seconds and restored at 90 seconds. Every baseline, settled-fault and
recovery gate passed, with 100% expected-status checks and zero unexpected
HTTP failures in those gated phases. Values below are baseline / fault / recovery.

| Scenario          | Requests          | p95 (ms)                 | p99 (ms)                  |
| ----------------- | ----------------- | ------------------------ | ------------------------- |
| Copy killed       | 736 / 1084 / 1124 | 258.44 / 260.25 / 186.63 | 490.40 / 511.56 / 305.50  |
| Redis unavailable | 735 / 909 / 1140  | 275.13 / 660.87 / 159.04 | 443.74 / 2149.60 / 212.48 |
| Copy drained      | 750 / 1106 / 1128 | 214.23 / 199.45 / 158.07 | 411.58 / 337.21 / 214.84  |

Transition errors/check failures remain in the JSON, separately from the
steady-phase gates. The killed copy stayed absent until explicit restoration.
Redis was the isolated test service; deep readiness returned expected 503
while health/proxy-ready/public schedule stayed available, then recovered.

For draining, PostgreSQL confirmed one lock waiter for a controlled schedule
request before SIGTERM. The copy reported proxy-ready 503 in 10.75 ms; its
in-flight request finished 200 in 1,446.29 ms with `Connection: close`. Shutdown
logs recorded one active request, then successful completion. The copy exited
0 without an OOM or forced kill and subsequently rejoined routing. Copy-ID
probes and actual fault/restoration timestamps are retained. Global proxy
access logging was not enabled or reconfigured for this test.

## Resources

Each web process stayed within the 768-MiB enforced cap in sampled RAM, and
no host/container OOM was observed. The JSON contains per-copy maxima and
CPU/throttling, host swap deltas, dependency statistics, AuthNEI probes and
generator RSS/CPU for each measured interval. The sampler uses 100% CPU to
mean one fully used core. Throttling time is cumulative cgroup throttled
microseconds per elapsed second, not a percentage of wall time.

| Selected run        | Web sampled RAM maxima, copies 1 / 2 / 3 (MiB) | Web CPU p95, copies 1 / 2 / 3 (%) |
| ------------------- | ---------------------------------------------- | --------------------------------- |
| 3 copies, 40 users  | 304.3 / 297.4 / 254.1                          | 71.0 / 70.4 / 65.5                |
| 3 copies, 200 users | 372.7 / 347.5 / 336.9                          | 100.0 / 100.1 / 95.3              |
| 2 copies, 200 heavy | 488.3 / 435.7 / 196.6                          | 102.7 / 102.0 / 14.6              |
| 3 copies, 200 heavy | 428.2 / 499.2 / 374.3                          | 96.8 / 98.3 / 94.6                |

Copy 3 in a two-copy case is idle, not a third serving replica. Shared-service
container names are replaced with fixed aliases in the public JSON; the
private raw resource artifact retains the operator inventory.

## Validation and completion

- `pnpm lint`: zero errors, six pre-existing warnings outside the new workload.
- Full Vitest run with isolated local PostgreSQL and authenticated Redis:
  195 files passed, 1 skipped; 1,172 tests passed, 4 skipped. Two skipped tests
  are opt-in frame benchmarks. The separate one-slot configuration ran its
  entire three-test file successfully, covering the other two conditional skips.
- The final four workload regressions passed, including all required heavy
  operations, binary CV verification, counters, staging guards and 429 handling.
- Typecheck, production build (one build worker), migration deployment and
  Prisma validation passed. Build also checked the final test sources.
- `pnpm dev` returned health 200 with `{ "status": 200 }` and schedule 200 with
  a JSON array. The task-owned dev server, local PostgreSQL and test Redis
  were stopped after validation. No application runtime source was changed.

The measurement work satisfies #453: both targets were exercised on two and
three copies; the required 80/160/200 cases and all three real faults ran;
p95/p99, errors, resource limits and resource observations were retained.
**Execution complete does not mean capacity approved:** the measured targets
failed, the exact-limit CV defect remains, and four-copy capacity is unmeasured.
The event copy-count/fallback decision remains with #446/#411/#344.

[Machine-readable evidence](task01-f-capacity-2026-11-14.json) includes exact
source/artifact hashes and limitations. Private session files and credentials
are excluded from the public report.

The isolated event-host stack and its three data volumes were removed after
exporting evidence; its sampler was stopped. Both hostnames now route to the
existing staging pool. The new CDN alias remains available with strict TLS,
HTTP-to-HTTPS redirect and observed health 200. No shared staging/production
container was stopped or reconfigured.

Compressed raw samples, summaries, operator scripts and a SHA-256 manifest
are retained locally under ignored `test-results/capacity453/` with private
permissions. Public hashes refer to the decompressed bytes. Synthetic session
files and task-only environment secrets were deleted after teardown.
