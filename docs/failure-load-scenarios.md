# Failure load scenarios (#451)

Run `tests/load/failure-scenarios.js` with k6 against isolated staging through
its load balancer. Requires two healthy web copies running the same revision,
working dependencies and an operator with access to the staging orchestrator.
Do not use a direct copy URL: this test exercises proxy routing and survival.

```bash
export E2E_BASE_URL=https://staging.example.org
export STAGING_BASE_URL="$E2E_BASE_URL"
export CONFIRM_NON_PRODUCTION=yes
FAILURE_SCENARIO=copy-removed k6 run --summary-export=copy-removed.json tests/load/failure-scenarios.js
```

Repeat separately with `redis-unavailable` and `copy-drained`, restoring and
verifying the entire topology between runs. Default load is 10 VUs (maximum
100), four GETs per iteration with a one-second pause. Requests time out at
five seconds and never follow redirects. No uploads or production mutations
are performed by the script.

## Operator timeline

Use the k6 start time as zero. Record actual action timestamps and container
IDs; a green run without the fault evidence does not validate the scenario.

1. 0–30 seconds: baseline. Confirm both copies receive requests from the proxy.
2. At 30 seconds inject exactly one fault:
   - `copy-removed`: force-stop one staging web copy without draining. Keep it
     absent until 90 seconds; disable automatic replacement for this interval.
   - `redis-unavailable`: stop the dedicated staging Redis service. Preserve its
     data volume. Confirm both web copies lose Redis connectivity.
   - `copy-drained`: start a rolling replacement of one staging web copy using
     SIGTERM and the configured stop grace period. Observe proxy-ready becoming
     503 on that copy, proxy eviction and completion of in-flight requests.
     Leave the surviving copy serving traffic until restoration.
3. At 90 seconds restore Redis or the removed/drained web copy. Verify the new
   copy is healthy and re-enters the proxy pool.
4. Continue until 150 seconds. Always restore services even if k6 fails or is
   interrupted; fault injection is performed by the operator, not by k6.

## Assertions and evidence

Baseline, settled fault (45–90s) and recovery (105–150s) each require samples,
100% expected-status checks, under 1% unexpected HTTP failures and p95 below
three seconds. Health, proxy-ready and schedule remain 200. During a Redis
outage deep readiness must return 503; after restoration it must return 200.
The 15-second transition windows account for readiness caching and proxy
healthcheck propagation. Their errors remain in the output and must be reported,
though they do not share the steady-phase gates.

Save k6 output and JSON summary, revision, topology, action timestamps, proxy
access logs, per-copy shutdown logs and Redis recovery evidence. For draining,
verify in-flight requests complete and the copy exits within its configured
grace period without forced kill; HTTP status alone cannot establish that.
This workload validates public read availability and readiness under load;
Redis limiter fail-closed upload behavior has separate coverage in
`tests/e2e/redisRateLimitFailure.test.ts` and `docs/operations/redis.md`.

Run the dependency-free scenario regression checks with:

```bash
node --test tests/load/failure-scenarios.test.mjs
```

These checks replace HTTP with a test double to validate emitted requests and
assertions. They are not load measurements. No staging measurements have been
recorded for this addition yet.
