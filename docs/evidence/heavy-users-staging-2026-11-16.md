# Authenticated heavy-user staging run — 16 November 2026

Issue: #604. The authenticated 200-user diagnostic run completed and **failed**
its performance/error limits. **This does not complete #604:** the user requires
a run on the existing staging deployment with its normal build, configuration
and event dates. The temporary-date result below is diagnostic evidence only.

On 16 November at 13:30 UTC, the existing staging deployment was inspected at
`cc5731c794d4e22203375be44ef7afac8b694ae9` across three web replicas. Its normal
event days remain 17–18 November, so a complete live-check-in run must wait
for a live session on those dates. No replacement run has occurred. Use the
revision actually deployed at run time and repeat quota/cleanup preflight.

## Deployment inspected

- deployment manager: the Coolify instance, Fallstack development environment.
- Staging application: `https://staging.example.invalid`.
- Source and deployed staging image revision:
  `942870609b4c2db0ad77cf974843efe3b9a7bed5` (includes #601).
- Existing proxy routes reference three web containers at that revision.
- Production remains at `04324637320f2fb200c46f14de5a3beb6e109cc6`;
  no application release or load test against production was requested/applied.

## Upload endpoint configuration

The user explicitly requested endpoint setup for both environments, and then
confirmed activation of public upload routes, exact-origin CORS, runtime
endpoint settings and the required service restarts.

| Environment | Public HTTPS origin                          | Private CV bucket             |
| ----------- | -------------------------------------------- | ----------------------------- |
| Development | `https://storage-staging.example.invalid`    | private development CV bucket |
| Production  | `https://storage-production.example.invalid` | private production CV bucket  |

Both Cloudflare A records are proxied, target the Cloudflare-proxied origin, and use automatic
TTL. deployment manager stores the corresponding `S3_PUBLIC_ENDPOINT` variables.
All three running staging web containers and the production web container were
recreated sequentially with their existing image revisions and the new endpoint
variable. Post-change inspection confirmed healthy status, identical network
membership, identical image references and unchanged other environment values.
Runtime `.env` files were updated too. Production's existing application image
predates the direct-upload feature; configuring its endpoint does not release
that feature. Private rollback configuration snapshots remain on the load host under
`[private server snapshot]`; stopped replacement backups were removed after validation.

Traefik dynamic configuration `fallstack-cv-uploads.yaml` routes only HTTPS
POST/OPTIONS at the exact environment bucket path to the existing private
MinIO API on port 9000. Host and path are preserved. Console access and bucket
policies were not changed. No public GET/list/delete route was added.

Allowed development browser origins are the existing
`https://staging.example.invalid`,
`https://staging-web.example.invalid`, and
`https://origin-85a4f3.example.invalid`.
Production allows `https://production.example.invalid` only.
Proxy CORS permits POST/OPTIONS and Content-Type, without credentials, with a
300-second preflight cache. MinIO's Compose configuration also sets
`MINIO_API_CORS_ALLOW_ORIGIN` to this explicit union. Only MinIO was recreated
in the shared data stack; PostgreSQL was not restarted.

## Checks performed

On 16 November, requests from the local Mac verified both endpoints:

- HTTPS certificate validation succeeded without bypasses.
- Allowed-origin OPTIONS/POST preflight: HTTP 200, exact matching
  Access-Control-Allow-Origin, allowed methods POST/OPTIONS.
- Untrusted-origin preflight: no Access-Control-Allow-Origin.
- GET, DELETE and OPTIONS to a different bucket: HTTP 503 from the existing
  proxy catch-all, with no matching storage route.
- Public staging and production `/api/health`: HTTP 200 following staging
  replica configuration changes. These checks do not prove authenticated CV
  transfers, database readiness or the complete heavy-user workload.

MinIO reported running/healthy after its CORS configuration restart. The host
reported approximately 7,141 MiB available memory, 3,266 MiB allocated swap,
and the application filesystem reported 20.7 GiB available disk space.
Before the full run, the bucket again reported quota `0 B`, private access
and no versioning. The host had 20,202,975,232 bytes available, exceeding the
runbook estimate of 7.5 GiB. Cleanup was scoped in advance to the exclusively
owned synthetic users, their upload tickets and corresponding UUID object keys.

Subsequent MinIO preflight reported the staging CV bucket private and
unversioned, with quota `0 B`. Its `/data` filesystem reported approximately
21 GiB available. No bucket policy or quota was changed.

An additional storage smoke ran from the staging web container using its
existing S3 credentials and the #601 PDF fixture generator at the inspected
revision. Signed POSTs went through the public staging hostname without
following redirects. Private S3 GETs checked exact size and SHA-256 equality:

```text
{"bytes":184320,"upload":204,"privateDownload":"sha256-match"}
cleanup verified 184320
{"bytes":10485760,"upload":204,"privateDownload":"sha256-match"}
cleanup verified 10485760
```

Each UUID-keyed smoke object was deleted in `finally`, then HEAD returned 404.
This proves signed storage transfer and cleanup for 180 KiB and exactly 10 MiB
PDFs. It does not exercise application upload authorization/finalization,
profile attachment, student/dashboard downloads, QR issuance or check-ins.
No production objects were uploaded or deleted.

## Isolated staging dates and fixtures

The user approved an isolated staging build with test dates because the deployed
application allows live check-ins only on 17–18 November. The build uses the
same revision above with exactly these temporary changes in
`src/edition/branding.ts`:

```diff
-    startsAt: "2026-11-17T08:30:00+00:00",
+    startsAt: "2026-11-16T08:30:00+00:00",
-    days: [17, 18],
+    days: [16, 18],
```

The image is `fallstack-task604:9428706-testdate-20261116`, digest
`sha256:9111ed2184b5947c65fcad9af9e9947798cd01f7c67aa29e5e755d41e3cf573c`.
The Docker build passed, including its existing lint/type checks. It was rolled
sequentially across the three staging replicas, preserving their other settings.
No clock, check-in authorization rule, production date or production image was changed.

An exclusive `task604-<UUID>` namespace owns 200 distinct synthetic users:
40 employees in one test company, 140 students and 20 staff. All emails use
`example.invalid`. Application sessions were signed inside staging using its
existing secret and normal claims; no real accounts, IdP traffic, secret exports
or authentication code changes were involved. Session cookies were supplied to
k6 through its environment and are excluded from published evidence.

The test company saved two synthetic students with preloaded CVs. A synthetic
live action exercised action QR scanning, and a day-1 synthetic schedule entry
from 00:00 to 23:59 covered the entire run on the test date.

Before k6, application HTTP smoke checks passed for both 184,320-byte and
10,485,760-byte PDFs: authorization 201, signed transfer 204, finalization 200,
attachment 200 and authenticated download 200, with exact byte count and SHA-256
match. Dashboard and history returned 200, QR issuance returned a token with
200, and live check-in returned 201.

## Workload and evidence

The unmodified #601 scenario uses 40 dashboard employees, 140 QR students and
20 staff; 60-second ramp, 180-second hold and 30-second ramp-down. Each dashboard
visit downloads up to two saved CVs every 10 seconds. QR students upload every
15 seconds, cycling through 180 KiB, 450 KiB, 1,200 KiB, 3 MiB and exactly
10 MiB. Staff submit check-ins every 3 seconds. Expected duplicate check-ins
are reported separately. The three account pools do not overlap.

k6 v2.4.0 (`dd9395906d`, Linux/amd64) ran on the application load host through the
public HTTPS/CDN hostname. Its official archive checksum was verified. The
shared generator adds host contention, so this is not an independent-generator
capacity certification. The three web containers have no explicit CPU or memory
limits; this is not the separate four-copy capacity scenario.

A three-user canary (one account per group, 3-second ramp, 15-second hold,
30-second ramp-down) passed all thresholds with 69/69 checks and 0 failed HTTP
requests. It accepted and downloaded both realistic and 10 MiB CVs. At least
one minute separated its last upload from the full run.

- [Canary k6 summary](heavy-users-2026-11-16/canary.json)
- [Canary configuration and sampled resources](heavy-users-2026-11-16/canary-metadata.json)

### Full 200-user result: failed

Orchestration interval: **2026-11-16 11:08:48–11:13:33 UTC**. k6 reached
**200 VUs**, completed 4,472 iterations and made 16,966 HTTP requests. Exit
status was **99** because eight thresholds failed; all workload-presence
thresholds passed. The raw k6 JSON uses `true` for a crossed/failed threshold.

| Metric                       |                 Observed |     Required |
| ---------------------------- | -----------------------: | -----------: |
| HTTP request failures        |  1,712 / 16,966 (10.09%) |         < 1% |
| Checks passed                | 16,617 / 18,310 (90.75%) |        > 99% |
| Dashboard page p95 / p99     |         6,247 / 8,450 ms | p95 < 750 ms |
| Dashboard history p95 / p99  |         1,857 / 3,273 ms | p95 < 750 ms |
| QR pass p95 / p99            |         1,696 / 3,117 ms | p95 < 750 ms |
| CV authorization p95 / p99   |         2,188 / 3,055 ms | p95 < 750 ms |
| CV attachment p95 / p99      |         1,986 / 3,089 ms | p95 < 750 ms |
| Check-in p95 / p99           |         3,072 / 4,118 ms | p95 < 750 ms |
| Complete CV upload p95 / p99 |        9,382 / 13,112 ms |  Report only |
| CV download p95 / p99        |         4,073 / 6,245 ms |  Report only |

The functional workload occurred:

- 1,183 accepted, attached and successfully downloaded CVs: **952 realistic**
  and **231 exactly 10 MiB**. Every successful student download matched its
  expected byte count; the separate smoke checks also verified full SHA-256.
- **1,646** successful company-dashboard CV downloads and **823** successful
  dashboard/history visits; no missing-CV counter was emitted.
- **2,159** successful student QR issuances; 140 action QR lookups, 139 new
  action completions and one expected already-completed response from the canary.
- **131** new live-session check-ins and **642** expected duplicates. Together
  with the nine preflight/canary check-ins, all 140 synthetic students were
  recorded in the test session.
- No CV-upload 429 counter was emitted. The failed checks were 973 upload
  authorizations, three finalizations and 717 check-in submissions. All signed
  transfers that were reached succeeded; attachment/download checks passed.

The unmodified scenario did not retain per-status/error-body histograms, so
these failures cannot all be assigned a specific HTTP status or dependency from
this evidence. The private metrics listener was unavailable after the run.
Limiter deadline/cooldown behavior under contention is a hypothesis, not an
established root cause. A single low-load authorization probe after the run
returned 201; its pending ticket was included in cleanup. No limits or security
checks were relaxed, and no second heavy run was used to replace this failure.

Forty resource samples were collected, nominally every five seconds plus
collection time. On the six-logical-CPU load host, sampled maxima were 2,431,124 KiB
RSS for k6; 428.7, 451.1 and 414.1 MiB for the three web replicas; and 611 MiB
for MinIO (1 GiB limit). Web CPU samples peaked at approximately 123–129%
per replica. Minimum host available memory was 4,082 MiB. Swap usage rose from
3,193 to a maximum of 3,531 MiB and ended at 3,515 MiB. All three web replicas
and MinIO retained zero restart/OOM counters and healthy status. These are
sampled values, not continuous peak measurements.

- [Full k6 summary and individual checks](heavy-users-2026-11-16/heavy-200.json)
- [Full configuration, revision and sampled resources](heavy-users-2026-11-16/heavy-200-metadata.json)

## Cleanup and restoration

All 200 synthetic users, their profiles, saved-student relations, check-ins,
action completions, test action/session/company and rank were removed. Cleanup
verified 1,188 ticket/profile-linked distribution keys and 1,192 quarantine keys
absent with S3 HEAD 404. A deleted synthetic user's session returned HTTP 401.

Nineteen additional promoted objects (44,300,288 bytes) remained after failed
finalization attempts. Before deleting them, cleanup verified that each object
fell within the full-run UTC window, matched the complete SHA-256 of an exact
#601 synthetic fixture, and had no Student or CvUpload reference. Short database
locks protected deletion tombstone creation; S3 deletion and HEAD verification
happened afterwards. StorageDeletion audit/tombstone records were retained.
A final bucket listing found **zero objects modified since the smoke began**.
No unrelated object was deleted and no global retention sweep was applied.

All three staging replicas were restored to the original `9428706…` image and
17–18 November event dates. Production retained its `0432463…` image. Every
web container was healthy with zero restarts/OOM flags, and public staging and
production health endpoints returned 200. The approved upload endpoint/CORS
configuration remains active in both environments. Available disk space after
cleanup returned to 20,207,190,016 bytes.

- [Owned fixture/object cleanup](heavy-users-2026-11-16/cleanup.json)
- [Promoted synthetic orphan cleanup](heavy-users-2026-11-16/cleanup-promoted.json)
- [Restored deployment and final checks](heavy-users-2026-11-16/postflight.json)

No production load, production upload or production data deletion occurred.
The existing staging deployment does **not** meet the 200-user performance/error
limits in this run; diagnosis and tuning require follow-up before claiming
capacity. SSO login, real-device QR camera scanning, production direct-upload
application behavior and a separate-generator capacity run were not tested.
