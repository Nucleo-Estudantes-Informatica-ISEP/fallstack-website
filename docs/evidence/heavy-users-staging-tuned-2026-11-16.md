# Tuned staging verification — 16 November 2026

Issue #604; follows #601. The user authorized the existing three staging web
containers, a temporary 16–18 November window, and restoration after testing.
No production load ran. MinIO remains storage behind the HTTPS proxy.

## Changes and validation

Revision `809772f2444a26335a7b5eefa8cb1b7ae1803611` contains:

- Redis admission deadline 800 ms; a timed-out command reconnects without
  imposing a replica-wide cooldown. Mutations are never replayed and failures
  remain closed. Socket/connect failures retain cooldown protection.
- Private CV downloads stream the SDK body, preserve authorization and
  no-store headers, propagate content length and request cancellation.
- Check-in student lookup selects only ID/name. No session/schedule cache or
  pool increase was introduced without a validated invalidation/budget model.

The temporary image adds only the approved event-date window and private
metrics configuration. Its image ID is
`sha256:e342add504c5e16c850861fff17d2827844c94ef353c12cac6573ef69d3644e7`.
All three running images were verified before the test. No clock or permission
bypass was used. The existing database, Redis, MinIO, networks and routes were
retained. The original schedule entries retained their calendar dates.

Local task-owned PostgreSQL was migrated and Prisma-validated before checks.
Full suite: 244 passed files, 3 skipped; 1,683 passed tests, 27 skipped.
After the last streaming/cancellation and narrow-read changes, affected tests
passed 32/32. Lint, typecheck and production build passed. The local protected
CV route returned JSON 401. The staging PDF smoke completed both 184,320-byte and
10,485,760-byte PDFs with matching SHA-256 hashes after download.
The PDF smoke then received an expected duplicate check-in (409), so its
fresh-check-in assertion failed; live creation was exercised by the canary
and full run instead.
Josimar's `tests/load/heavy-users.test.ts` passed 64/64 (unchanged scenario
code; earlier successful evidence reused). Skipped tests retain their normal
project conditions; they are not counted as passes.

## Measurement protocol

Official k6 2.4.0 on the user's Mac over fast Wi-Fi and public proxied HTTPS.
Unmodified scenario: 40 dashboard, 140 QR/student, 20 staff users; 60 s ramp,
180 s hold, 30 s ramp down; 15 s upload interval. Two hundred synthetic accounts.
Canary passed all 70 checks and all thresholds. Bucket private/unversioned,
no configured quota, and free space exceeded the preflight budget. Cleanup
was limited to synthetic owners and hash-confirmed unreferenced test PDFs.

The first corrected-image run produced 5,959 requests, 6.41% HTTP failures and
90.98% checks. Runtime image IDs stayed fixed; no web/MinIO restart or OOM was
observed. Limiter counters on these three replicas recorded allowed outcomes
and no unavailable outcomes despite four client-visible authorize 503s;
therefore those responses cannot be assigned to this limiter from status
alone. All six light endpoint p95 thresholds failed.

Routing inspection found a duplicate service referencing an obsolete primary.
Removing it and retrying yielded 4,889 requests, 3.21% HTTP failures and 95.80%
checks. This was still a failed workload. The replica timer also republished
unchanged dynamic configuration every 15 seconds while Traefik reported a
missing service. It now compares the generated file, sets permissions before
publication, and atomically replaces only changed topology. The stale alias
service was removed; both host routers use the canonical service.

These sequential runs are not controlled experiments: caches, network and
fixture state differ. Their percentages do not prove a causal improvement.
TCP resets observed at an edge IP identify the transport boundary, not the
component responsible. No sole Cloudflare, Redis, database or MinIO root cause
is established without correlated upstream traces.

## Final run after routing fixes

The final run reached 200 VUs: **5,417 requests, 125 HTTP failures (2.31%),
4,370 checks passed and 136 failed (96.98%)**, k6 exit 99. It completed 300
uploads (296 real-size, 4 exactly 10 MiB) and 706 downloads (429 dashboard,
273 real-size student, 4 near-limit student). The reused fixture yielded
1,286 expected duplicate check-ins; fresh creation was proven in the first
corrected-image run (131 created) and canary. These reruns reuse users and
company history, so they do not have identical initial database state.

| Light endpoint    | Final p95 | Required |
| ----------------- | --------: | -------: |
| Dashboard         | 18,839 ms |  <750 ms |
| Dashboard history |  6,531 ms |  <750 ms |
| QR pass           |  6,076 ms |  <750 ms |
| CV authorize      |  5,238 ms |  <750 ms |
| CV attach         |  4,947 ms |  <750 ms |
| Check-in          |  6,567 ms |  <750 ms |

Every capacity threshold above remains failed. Workload-presence thresholds
passed. Threshold booleans in the legacy k6 JSON are failure flags (`true`
means failed), not pass flags. The complete summaries, endpoint/status
histograms, generator samples and telemetry are in the adjacent evidence folder.
Raw request logs with signed URLs/cookies remain private and are not committed.

After the timer change the dynamic file mtime stayed fixed across ticks and
no staging missing-service messages appeared during the final run. All three
images stayed at the verified digest, healthy, with zero restarts/OOMs.
Their limiter counters contained no unavailable outcomes. This rules out a
measured limiter cooldown cascade on those replicas during this run; it does
not prove all network requests reached those replicas. Streaming and resource
samples do not establish a controlled before/after memory reduction.

## Remaining investigation

Capture a correlated request trace at edge, Traefik, web and MinIO for the
remaining 502/reset/timeout cases. Record upstream address, status and latency
without query strings or authorization. Separate generator uplink throughput
from origin queueing using bounded matched probes. Collect PostgreSQL pool
wait/query latency and Node event-loop delay before increasing connections.
Then address measured dashboard/session queries; keep authorization fresh and
bound cache invalidation explicitly. Raising MinIO memory alone is not a fix
for the remaining failed gate. No further capacity pass is claimed.

## Cleanup and restoration

All 200 synthetic users and their relations were removed. All 3,508 owned
upload keys returned HEAD 404; no additional hash-confirmed promoted orphan
was found in this final cleanup. The schedule returned to nine day-1 entries
and seven day-2 entries. A revoked synthetic session returned 401.
All three staging containers were restored to normal revision
`ea26bd5c374a46bad42f760747c9afb9854cc3ab`, image ID
`sha256:64d32ab1986e99cf3210f4337a9c0277fda4e57718063fc06f0c2d1159f38ce2`.
They were healthy and retained S3. Public staging and production health were 200. The temporary test image was removed. MinIO is healthy with its durable
10 GiB limit. This final cleanup reclaimed another 9.828 GB of build cache;
free disk was 24,581,595,136 bytes afterwards. Shared volumes were preserved.
Earlier cleanup reclaimed approximately 11.7 GiB before these new builds.

The durable replica-script adjustment is limited to temporary-file location
and publication; existing replica count and application configuration remain:

```sh
TMP_YAML=$(mktemp "${DYNAMIC_YAML}.XXXXXX")
# Generate existing topology into TMP_YAML, then:
if cmp -s "$TMP_YAML" "$DYNAMIC_YAML"; then
  rm -f "$TMP_YAML"
else
  chmod 644 "$TMP_YAML"
  mv "$TMP_YAML" "$DYNAMIC_YAML"
fi
```

Shell syntax validation passed. Repeated timer ticks left the unchanged file's
mtime fixed; the final run logged zero staging missing-service messages.

## Final CI regression correction

CI exposed two real-Redis outage tests whose hard-coded 650 ms pause no longer
exceeded the new 800 ms command deadline. Their injected outage now derives
from `redisLimiterTiming.deadlineMs + 350`; the expected fail-closed behavior
and shared allowance assertions are preserved. Against disposable loopback
Redis and the migrated isolated PostgreSQL database, distributed/failure
integration tests plus Josimar's scenario tests passed **79/79**. Josimar's
64 tests were therefore also rerun at the final revision. Affected ESLint and
typecheck passed. No application runtime changed after the measured image;
previous full suite/build evidence remains applicable to that runtime.
