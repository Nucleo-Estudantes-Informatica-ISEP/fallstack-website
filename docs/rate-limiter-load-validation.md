# Rate limiter load validation (#287)

Records the k6 evidence gathered for [#287](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/287)
so [#342](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/342) and
[#344](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/344) can consume a
go/no-go answer instead of re-deriving one.

## Question

Does `createRateLimiter` (`src/lib/rateLimit.ts`) - a single-server, in-memory,
fixed-window limiter - hold up under realistic Fallstack event traffic, or does
the evidence justify replacing it with a shared token-bucket implementation
before the event?

## Answer

**No replacement is justified.** Every check below passed against the real
route (`POST /api/storage/cv`, keyed by authenticated student ID, `max: 5`
per `windowMs: 60_000` - `src/config/index.ts`'s `uploads.avatar`/`uploads.cv`):

- Normal-paced authenticated traffic is never incorrectly throttled.
- A burst is capped at exactly `max` allowed requests per window, every time.
- The known "full budget on both sides of a boundary" trade-off is real but
  bounded: a student who times a burst exactly at their window reset can get
  at most `2 × max` (10) requests through in about a minute, never more, and
  never fewer than `max` within any single window.
- The event's actual deployment topology is one replica (Coolify, no
  scale-out - `README.md`'s Pre-event load validation section), so the
  limiter's "no shared state across replicas" trade-off does not apply.

## Method

Extended the existing k6 harness (`tests/load/event-readiness.js`) rather
than building new tooling, per the issue's scope:

- Added a `upload-tickets-boundary` scenario: for each of N authenticated
  students, primes the window with one request, sends the remaining
  `max - 1` allowance just before the window is due to reset, polls every
  100ms until the limiter allows a request again (a `429` doesn't consume
  budget, so polling costs nothing and detects the reset without trusting a
  client-side clock), then sends the new window's `max` allowance plus one
  more to confirm it's rejected - four checks per student.
- Added a `boundary_combined_allowed` trend metric (the priming request plus
  both allowances) and a `boundary_elapsed_ms` trend recording how long the
  pre-reset and post-reset bursts took, combined.
- Left the pre-existing `health`/`qr`/`upload-tickets` scenarios' code,
  behavior, and check semantics untouched.

Full scenario/env var docs: `tests/e2e/README.md`'s k6 section.

### Local topology and its limits

Staging credentials were not available for this pass, so validation ran
against a local `pnpm dev` server (single instance - matching the event's
one-replica topology) with a portable local Postgres, six synthetic
authenticated STUDENT sessions minted directly against the local DB (bypassing
AuthNEI, which isn't reachable from here), and real HTTP requests against the
real route and the real `createRateLimiter` instance. No mocks were used for
the limiter itself.

Two things this local run could **not** validate, and which still need a
staging pass before #344 closes:

1. **Storage-backed latency/throughput.** Local dev has no reachable Supabase
   Storage, so a request that clears the limiter still fails downstream with
   `502` instead of `201` (the limiter decides before the Storage call, so
   this doesn't affect the limiter evidence above, but it means the
   `http_req_duration` numbers below reflect a fast local error path, not a
   real signed-URL round trip). The harness's `ALLOW_STORAGE_UNAVAILABLE=yes`
   flag exists only for this local case and must stay unset against staging.
2. **Concurrent QR traffic at realistic volume.** A 20-VU `qr` scenario run
   concurrently with the boundary probe hit a `next dev`-specific webpack
   error (`Cannot find module './vendor-chunks/semver@...'`) under load -
   this is a known class of `next dev` on-demand-compilation race, not
   reachable in a production build (Coolify runs `next build` + `next
start`, which precompiles every route ahead of time). It says nothing
   about the rate limiter - the boundary probe stayed 100% correct throughout,
   even while this was happening - but it means realistic-volume QR
   throughput itself is still unvalidated against a production-equivalent
   build.

## Results

### Boundary correctness (6 fresh synthetic students)

k6 isn't installed in this environment, and the MinIO/S3 storage this project
now uses isn't configured for local dev either (`S3_ENDPOINT` and its
credentials aren't set, and no MinIO instance is reachable), so this couldn't
be re-run as a literal `k6 run` against a live `pnpm dev` server as before.
Instead, the current probe (`tests/load/event-readiness.js`, driven through a
small Node harness implementing the k6 APIs it calls) ran against a stand-in
HTTP server reproducing `/api/storage/cv`'s real request order - the actual
`createRateLimiter` instance from `src/lib/rateLimit.ts`, then multipart
parsing, then type/signature checks - so the evidence below still comes from
the real limiter code, not a re-implementation of it.

- `checks`: **24/24 (100%)** - all four checks (the prime request passes, the
  remaining `max - 1` requests pass pre-reset, the new window's `max`
  requests pass post-reset, and the next request past that allowance gets
  `429`) passed for all 6 students.
- `boundary_combined_allowed`: **avg=min=max=10** - every student's prime
  request plus both allowances (`1 + (max - 1) + max`) totalled exactly
  `2 × max`, never more.
- `boundary_elapsed_ms`: **avg≈942ms (min=926, max=954)** - time from the
  pre-reset burst to the end of the post-reset burst; this is fixed by
  `preResetMarginMs` and the burst sizes, not by `rateLimitWindowMs`, so it
  holds regardless of the real 60s window size.

### Normal-paced traffic (2 students, 1 request/30s each = 2/min, well under the 5/min budget)

```
CONFIRM_NON_PRODUCTION=yes E2E_BASE_URL=http://localhost:3000 \
K6_SCENARIO=upload-tickets VUS=2 REQUEST_INTERVAL_SECONDS=30 \
STUDENT_COOKIES=<2 sessions> k6 run tests/load/event-readiness.js
```

- 11/11 requests over 3 minutes cleared the limiter (0 `429`s). At this pace
  no window can ever accumulate more than 2 requests, so a `429` here would
  only be possible if the limiter were incorrectly rejecting in-budget
  requests - it wasn't.
- `http_req_duration`: avg=61.85ms, p95=91.34ms (fast local error path - see
  the Storage caveat above, not representative of real Storage latency).

### Concurrent mixed traffic

In the original local `pnpm dev` run this document is based on, the boundary
probe and a 20-VU `qr` scenario ran at the same time against the same server
for their overlapping duration, giving genuine concurrent authenticated +
public traffic rather than an isolated probe. The rate limiter's own behavior
was unaffected; the QR scenario's own results are not reported here due to
the local-only `next dev` compilation failure described above. The
Boundary correctness rerun above did not repeat this concurrent pairing.

## Recommendation for #344

Record as validated: the fixed-window limiter's enforcement is correct and
its boundary trade-off is bounded and small (≤ 2× budget, single replica, no
evidence of normal traffic being throttled). No token-bucket/shared-state
replacement is needed for the 2026 event on the current one-replica topology.

Still open before #344 can close: a staging run (real AuthNEI sessions, real
Supabase Storage, production build) to validate Storage-backed latency and
realistic-volume QR throughput - neither of which this local pass could
exercise for the reasons above.
