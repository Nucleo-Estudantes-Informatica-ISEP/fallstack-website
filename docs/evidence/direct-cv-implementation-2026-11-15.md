# Direct CV uploads: implementation and verification

Issue: [#594](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/594).
Base: `dev` at `80cfb49`. No deployed infrastructure or production configuration changed.

## Architecture and endpoints

Previously: browser multipart → Next.js/Busboy → `/tmp` → streamed PUT → MinIO.
Now: authenticated JSON authorization → browser POST to MinIO quarantine → HEAD
and conditional bounded ranges → conditional S3 copy → fenced transactional
association. Normal CV bytes never traverse Node.js or its temporary filesystem.
Quarantine/promotion still performs storage I/O; physical I/O reduction is not assumed.

| Endpoint                        | Contract                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /api/storage/cv`          | JSON filename/type/size → 201 uploadId/url/fields/expiry; old multipart receives 415 |
| `POST /api/storage/cv/finalize` | Owner-bound uploadId → 200 validated final id after storage validation and DB commit |
| `POST /api/storage/cv/cancel`   | Cancels pending authorization; repeated cancellation is safe                         |
| Existing profile CV attachment  | Verifies ticket owner and consumption; replay cannot restore a superseded CV         |

Existing profiles are associated during finalization. Signup consumes its ready
ticket inside profile creation. Repeating the current attachment does not reset
retention. Existing associated CVs and private downloads remain compatible; old
unattached ids cannot be newly associated. All frontend, Playwright and normal
k6 consumers use the new contract. Old memory benchmarks remain historical
service-level comparisons. Avatar/logo transport is unchanged.

## Dependency, migration and environment

Added `@aws-sdk/s3-presigned-post`, locked at 3.1163.0 to match the installed S3
client. It provides official SigV4 POST signing; related AWS/Smithy resolutions
are recorded in the lockfile. The signer loads only for CV authorization.
No new runtime service, queue or worker.

Migration adds owner-bound `CvUpload`, size/state constraints and state/age
indexes. ADR 0040 records the protocol and recovery rules.

New runtime variables: `S3_PUBLIC_ENDPOINT` (HTTPS origin; loopback HTTP allowed)
and `CV_UPLOAD_TTL_SECONDS` (300 default; 30–600 permitted). Internal
`S3_ENDPOINT` stays separate. CSP grants the configured public origin only in
`connect-src`. Missing public configuration fails closed. `.env.example`,
Compose templates and the cleanup Docker stage are updated.

## Security and recovery

POST policies bind exact declared size within the 10 MiB ceiling, exact
server-generated quarantine key, bucket, PDF Content-Type and success status.
No secret key or reusable credentials are returned. MinIO rejects modified
policy fields and oversized/empty files before publishing an accepted object.

Finalization checks actual size/type, PDF magic/version/end marker using at most
1,040 bytes, and conditions both reads and copy on the observed ETag. Every
attempt gets a fresh destination. Durable 90-second leases and attempt fencing
prevent stale validators publishing over another attempt. Old URLs can rewrite
quarantine until expiry, but cannot mutate a final CV.

Storage I/O happens outside DB transactions. Ticket consumption, association and
action completion commit together. Ambiguous failures never delete a possibly
published destination. Existing seven-day reconciliation reclaims unpublished
copies. The existing worker removes quarantine older than 24 hours, including
abandoned/cancelled/replayed objects. Enable apply mode after dry-run review.
Tickets retain owner/id/state history for account lifetime and cascade on account
deletion. Signup-ready tickets can be consumed within 24 hours.

## Concrete MinIO compatibility

Tested `coollabsio/minio:RELEASE.2025-10-15T17-29-55Z`, digest
`sha256:69b55a1c1c5dc285ce04db96689f5b2102317fc77a50680a1874ca6efd1c87f9`.
Binary reports that release, Go 1.24.9. Real tests verify POST exact-size policies,
expiry, private buckets, conditional ranges and conditional CopyObject.

Per-bucket `PutBucketCors` returns `NotImplemented` on this image. Explicit
global origins work: allowed OPTIONS receives the origin/method/header; foreign
origins receive no grant. The runbook supplies an existing-Traefik upload router
restricted to POST/OPTIONS and explicit headers/origins. Live settings were not applied.

## Automated and manual checks

Final Linux full suite: **1304 passed, 4 skipped; 216 files passed, 1 skipped**
in 272.84 seconds. This includes the real MinIO and distributed Redis integration
tests and the Unix hook tests. Frozen dependency installation, migration replay
and Prisma validation also passed in that environment.
All application checks use a confirmed migrated task-owned PostgreSQL 16 database,
local MinIO and authenticated Redis. Linux verification uses temporary dependency
and Next cache volumes. Shared/production data is never used.

Real MinIO integration has 11 cases: byte-identical private download, policy
limits/expiry/key/type, auth/IDOR, old transport refusal, spoofed/truncated PDF,
ETag races, concurrent finalization/users, cancellation/abandonment/replay cleanup,
signup association, DB rollback/retry and stale-lease fencing. Unit tests cover
signing contracts, storage failures/retries, schema bounds, signatures, browser
direct transfer and ordered k6 multipart encoding.

`pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm exec prisma validate`
passed locally. Native Windows standalone packaging used a task-only junction
preloader because unprivileged symlink creation returns EPERM. No repository
configuration or OS setting was changed for that workaround. Linux verifies
the Unix-only hook tests.

Authenticated `pnpm dev` smoke: authorization 201, direct 10 MiB POST 204,
finalization 200, private download 200 with identical SHA-256, repeated finalization
returns the same id; anonymous initiation returns 401. Integration/load PDF
fixtures contain real one-page PDF objects, xref and trailer.

## k6 results

All nine recorded cases passed thresholds: **130/130 uploads**,
**2,240/2,240 business requests**, **2,630 HTTP requests**, **zero HTTP errors
and zero upload timeouts**. Each business scenario creates 80 unique scans and
80 action check-ins, plus QR, profile and history reads. Synthetic rows/objects
were cleaned after every run.

One short wave per case; one compiled Next.js 15.5.29 process, Node 24.21.0 on
Windows; PostgreSQL/MinIO/Redis on Docker Desktop. Other task verification was
paused throughout the recorded matrix. Transfers align at 3 seconds; intentional
alignment wait is excluded from total latency. No production/staging load ran.

[Full aggregate metrics/resources](direct-cv-local-2026-11-15.json) ·
[Interactive chart](direct-cv-local-2026-11-15.html).

| Case     | Uploads × MiB | Total avg / median / p95 / p99 ms | Authorization p95 | Transfer p95 | Finalize p95 |
| -------- | ------------- | --------------------------------- | ----------------: | -----------: | -----------: |
| A        | 5 × 10        | 536.6 / 532 / 547.8 / 548.8       |              39.1 |        259.8 |        229.6 |
| B        | 10 × 10       | 1164.3 / 1165 / 1195.7 / 1196.7   |              54.5 |        688.3 |        432.8 |
| C        | 20 × 10       | 2019.2 / 2087 / 2127.0 / 2141.4   |             107.7 |        986.1 |       1019.1 |
| D        | 40 × 10       | 3655.8 / 3915.5 / 4091.2 / 4103.2 |             267.5 |       2912.9 |       1813.5 |
| E        | 20 × 5        | 1203.2 / 1255 / 1336 / 1351.2     |             137.3 |        631.3 |        554.1 |
| Mixed 5  | 5 × 10        | 594.4 / 589 / 604.2 / 604.8       |              50.9 |        290.0 |        259.2 |
| Mixed 10 | 10 × 10       | 1148.8 / 1135 / 1217.6 / 1246.7   |             112.5 |        630.0 |        474.7 |
| Mixed 20 | 20 × 10       | 1892.9 / 1907 / 1969.2 / 1987.4   |             143.4 |       1014.0 |        816.1 |

Throughput across each full k6 run (including alignment/business time), uploads/s:
A 1.43, B 2.42, C 3.98, D 5.84, E 4.76; mixed 5/10/20: 0.58/1.10/2.24.
These are observed run rates, not storage capacity limits. JSON includes all
phase averages, medians, p95, p99, minima and maxima.

| Business scenario | All operations p95 / p99 ms | Scans p95 / p99 ms | Check-ins p95 / p99 ms | Success |
| ----------------- | --------------------------- | ------------------ | ---------------------- | ------: |
| No uploads        | 45.4 / 61.2                 | 62.5 / 68.8        | 46.8 / 53.6            | 560/560 |
| Mixed 5           | 47.9 / 80.8                 | 68.5 / 107.2       | 50.9 / 84.6            | 560/560 |
| Mixed 10          | 54.4 / 98.0                 | 131.8 / 193.1      | 72.0 / 82.0            | 560/560 |
| Mixed 20          | 81.1 / 148.5                | 114.3 / 190.0      | 81.1 / 94.5            | 560/560 |

Actual 20-upload overlap is proven: latest transfer start 3009.704 ms, earliest
completion 3941.750 ms after run start: **932.046 ms with all 20 transfers active**.
Critical operations remain below the declared p95 1000 ms/p99 2000 ms thresholds.
There is an observed latency increase; this is not evidence of zero interference.

## Resources and historical comparison

Mixed20 sampled web RSS: 399.0 MiB versus baseline 380.5 MiB. Mean web CPU over
sampled intervals: 58.8% versus 54.1% of one logical core. MinIO reached sampled
793.5 MiB/105.7% CPU; PostgreSQL 69.0 MiB/12.9% CPU. Samples are approximately
three seconds apart, not guaranteed instantaneous peaks.

Mixed20 MinIO: approximately 210 MB received/0.6 MB sent; block-I/O counters rose
8 MB read/420 MB written. Prometheus deltas show 20 POSTs, 20 HEADs, 40 range GETs,
20 copies and 20 deletes; no new 4xx/5xx. TTFB histogram p95 upper bounds:
POST 1 s, COPY 0.5 s, HEAD/GET/DELETE 0.05 s.

Docker VM device `sdd`: 424660992 written bytes, mean read/write operation time
18.09 ms, 10.62% busy during the mixed20 sample. This is guest/device-wide data,
not VPS physical disk. PostgreSQL recorded no new rollback/deadlock; round-trip
query probes are in JSON. Its I/O timing counters were disabled/zero; no
application statement-latency distribution was collected.

Historical heavy result: 200 VUs, 6894 HTTP requests, 1.3 GB sent, 10.96% global
errors, 36 completed 10 MB uploads, 30 s upload timeouts. Machine, workload and
replica count differ. No old/new speedup or VPS capacity claim is justified.
This matrix verifies protocol and measured local interference; sustained event
host acceptance remains an operator-controlled non-production exercise.

## Reproduction, manual rollout and limits

The [runbook](../operations/direct-cv-uploads.md) provides local MinIO, integration,
k6 and cleanup commands. `capacity.js` is absent from current dev; scripts reuse
existing staging-target/session conventions and provide local-only synthetic
fixture lifecycle. k6 requires absolute fixture/PDF paths. The ordered encoder
keeps the file last, and scenario iteration ids keep business pairs distinct.

Operators must configure DNS/TLS and the existing Traefik S3 upload router; set
`S3_PUBLIC_ENDPOINT` on every replica; configure explicit MinIO CORS origins and
proxy methods/headers; apply migration through the normal migrator; deploy
client/replicas together; review cleanup dry-run and enable apply. Never expose
console port 9001. None of these live settings changed.

Envelope validation preserves old signature checks and adds PDF version/end
marker checks. It is not a full PDF parser, antivirus or sanitizer: a corrupt
internal body with a valid envelope can pass. Full semantic parsing requires a
separate validation/resource design and whole-document access. Quarantine copies
still consume VPS resources. POSTs cannot be individually revoked; cancellation
prevents finalization and delayed cleanup removes recreated objects. Unpublished
destinations can remain until seven-day reconciliation. No global concurrency
cap or external storage service is introduced.

## File inventory

Modified:

- .env.example
- .github/workflows/ci.yml
- Dockerfile
- README.md
- docker-compose.app.yml
- docker-compose.local.yml
- docs/architecture.md
- docs/decisions/README.md
- docs/operations/uploads.md
- package.json
- pnpm-lock.yaml
- prisma/schema-extras.json
- prisma/schema.prisma
- src/app/api/storage/cv/route.ts
- src/app/api/storage/route.test.ts
- src/application/services/objectStorageService.ts
- src/application/services/storageCleanupService.ts
- src/application/services/studentService.ts
- src/client/api/upload.test.ts
- src/client/api/upload.ts
- src/config/env.storage.ts
- src/security/csp.js
- src/security/csp.test.ts
- tests/e2e/playwright/multi-copy.spec.ts
- tests/e2e/playwright/student-event-flow.spec.ts
- tests/e2e/rateLimiterBoundary.test.ts
- tests/load/event-readiness.js
- tests/load/upload-qr-interactions.js
- tests/security/csp.test.ts
- tests/security/cspTestUtils.ts

Created:

- docs/decisions/0041-direct-private-cv-uploads.md
- docs/evidence/direct-cv-implementation-2026-11-15.md
- docs/evidence/direct-cv-local-2026-11-15.html
- docs/evidence/direct-cv-local-2026-11-15.json
- docs/operations/direct-cv-uploads.md
- prisma/migrations/20261115010000_direct_cv_uploads/migration.sql
- src/app/api/storage/cv/cancel/route.ts
- src/app/api/storage/cv/finalize/route.ts
- src/application/repositories/cvUploadRepository.ts
- src/application/services/cvQuarantineCleanupService.ts
- src/application/services/directCvUploadService.test.ts
- src/application/services/directCvUploadService.ts
- src/config/env.storage.test.ts
- src/domain/cvUpload.test.ts
- src/domain/cvUpload.ts
- src/schemas/directCvUploadSchema.ts
- tests/e2e/directCvUpload.test.ts
- tests/e2e/playwright/directCvUpload.ts
- tests/fixtures/pdf.ts
- tests/load/direct-cv-fixtures.ts
- tests/load/direct-cv.js
- tests/load/minioPost.js
- tests/load/minioPost.test.ts
