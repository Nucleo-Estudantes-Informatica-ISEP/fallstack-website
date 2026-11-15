# Direct CV uploads

## Protocol

1. Authenticated STUDENT (including before profile creation) sends JSON to
   `POST /api/storage/cv`: `{ "filename": "cv.pdf", "contentType":
"application/pdf", "size": 10485760 }`. The shared five-per-minute allowance
   is consumed before reading the request. Metadata is strict: no destination
   profile or object key is accepted.
2. Response 201 contains `uploadId`, `url`, `fields`, `expiresAt`. Append all
   signed fields to FormData unchanged, then append `file` **last**. POST to the
   public MinIO API, without app cookies or custom headers. Do not set the
   multipart Content-Type yourself. Success is 204.
3. `POST /api/storage/cv/finalize` with `{ "uploadId": "..." }` returns 200
   `{ "id": "..." }` only after HEAD, conditional ranges, PDF envelope validation,
   conditional copy and DB commit. Existing profiles are associated atomically.
   Signup receives a ready, owner-bound id and consumes it during profile creation.
4. Optional `POST /api/storage/cv/cancel`, same body. Cancellation is idempotent
   for pending/cancelled tickets; active validation/completed tickets return 409.

401 means no session, 403 wrong role, 404 missing/foreign ticket, 409 missing
object/busy/consumed ticket, 410 expired ticket, 400 invalid metadata/document,
415 obsolete multipart transport, 429 allowance exhausted, 503 storage or limiter
unavailable. Concurrent finalization can return 409; retry with bounded backoff.
Retry ambiguous finalization with the **same uploadId**, not another transfer.
The browser retries finalization up to three times and reports failure through
the existing null/error UI contract. There was no byte-progress UI to preserve.

The signing access-key identifier in `X-Amz-Credential` is public SigV4 metadata,
not a secret. Neither the secret key nor reusable session credentials are
returned. Treat policies and signed form fields as short-lived bearer secrets:
do not log response bodies or attach them to telemetry.

## Configuration and rollout (operator action; not applied by this PR)

| Variable                            | Meaning                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `S3_ENDPOINT`                       | Private/internal S3 origin used by server/cleanup, e.g. `http://minio:9000`                              |
| `S3_PUBLIC_ENDPOINT`                | Browser-reachable **S3 API** origin, e.g. `https://files.staging.example.org`; no path/query/credentials |
| `CV_UPLOAD_TTL_SECONDS`             | Signed policy lifetime, default 300, permitted 30–600 seconds                                            |
| Existing `S3_*` credentials/buckets | Same private buckets and environment-scoped credentials                                                  |
| `STORAGE_CLEANUP_MODE`              | Existing singleton worker; review dry-run, then set `apply`                                              |

These are runtime variables, including CSP `connect-src`; no new
`NEXT_PUBLIC_*` or Docker build arguments. Compose forwards them to web/cleanup.
Never set the public origin to the Docker container name. Do not rewrite a
signed URL's hostname/path after signing.

Before enabling the new client:

1. Create DNS A/AAAA for the chosen files hostname to the **existing** VPS.
2. Configure its existing Traefik HTTPS router to MinIO **port 9000**. Keep Host
   and URL path unchanged and enable normal certificate issuance/TLS. Do not
   route to console port 9001. Keep console private. Set an appropriate request
   duration (e.g. 120 seconds); account for multipart overhead above 10 MiB.
3. Set MinIO `MINIO_API_CORS_ALLOW_ORIGIN` to the comma-separated exact web
   origins for this environment. No `*`; separate dev/main origins. Restart
   MinIO only in an approved maintenance/configuration change. Local Compose
   includes `http://localhost:4000` and `http://localhost:3000`.
4. The pinned `coollabsio/minio:RELEASE.2025-10-15T17-29-55Z` reports
   `NotImplemented` for `PutBucketCors`. Its global CORS reflects supported
   preflight methods/headers for allowed origins. Restrict the **public upload
   router**, using existing Traefik, to POST/OPTIONS and the headers below.
   Preserve any separate authenticated operations router used for other clients.
5. Set runtime public endpoint/TTL on all web replicas, apply the committed
   migration through the normal migrator, and deploy all replicas/client assets
   together. Stale clients receive 415; no automatic proxy fallback exists.
6. Review worker dry-run, verify private/unversioned buckets, enable `apply`,
   verify a full upload/download, CSP and preflight from each real web origin.

Example Traefik dynamic middleware (adapt existing routers, do not add another
proxy/service). The public upload router must route only POST and OPTIONS
requests for the CV bucket; other public methods must have **no matching route**.
An HTTPS redirect router may remain separate. The backend continues using its
private Docker connection for HEAD/GET/COPY/DELETE.

```yaml
http:
  routers:
    cv-upload:
      rule: "Host(`files.staging.example.org`) && Path(`/fallstack-staging-cvs`) && (Method(`POST`) || Method(`OPTIONS`))"
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
      service: minio-s3
      middlewares: [cv-upload-cors]
  middlewares:
    cv-upload-cors:
      headers:
        accessControlAllowOriginList: ["https://staging.example.org"]
        accessControlAllowMethods: [POST, OPTIONS]
        accessControlAllowHeaders: [Content-Type]
        accessControlAllowCredentials: false
        accessControlMaxAge: 300
        addVaryHeader: true
  services:
    minio-s3:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: http://minio:9000
```

No browser Authorization header is needed: credentials/signature are form
fields. No response headers need exposing. Fetch FormData normally uses a
CORS-safelisted Content-Type; verify OPTIONS too, including rejection of
unexpected origins/methods/headers at the proxy. CORS is browser policy, not
storage authorization; private bucket policy and signatures remain mandatory.

Use environment-scoped S3 credentials allowing only necessary bucket/prefix
operations: backend ListBucket/GetBucketVersioning, Get/Put/DeleteObject on
`quarantine/cv/*` and `distribution/cv/*` in the CV bucket, plus existing media
permissions. Copy requires read-source/write-destination. No browser list/read/
delete grant or public bucket policy is needed.

## Local integration

Use the README's pinned MinIO image. The tests refuse non-loopback storage and
create a unique private disposable bucket. Prepare a confirmed isolated local
PostgreSQL database first, export both database URLs, deploy migrations and
validate Prisma **before any application check**. Never source production .env.

```bash
export DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:55432/fallstack_direct
export DIRECT_URL="$DATABASE_URL"
pnpm migrate:deploy
pnpm exec prisma validate
export TEST_MINIO_ENDPOINT=http://127.0.0.1:59000
export TEST_MINIO_ACCESS_KEY=direct-local
export TEST_MINIO_SECRET_KEY=replace-with-local-secret
export CONFIRM_LOCAL_STORAGE_TEST=yes
pnpm exec vitest run tests/e2e/directCvUpload.test.ts
```

Start MinIO with `MINIO_API_CORS_ALLOW_ORIGIN=http://localhost:3000` for the CORS
test. Export test credentials explicitly; tests never fall back to `.env` S3
credentials. CI provisions this pinned image and requires real integration.
Security/concurrency tests exercise real policies, byte-identical private reads,
expiry, size, IDOR, replay, conditional range/copy and profile attachment.
Service tests inject storage/DB failures without touching external services.

## Cleanup and failure recovery

Existing `pnpm storage:cleanup` previews changes; `pnpm storage:cleanup --apply`
applies them. The existing scheduled singleton worker handles this too.
Quarantine objects older than 24 hours are deleted regardless of ticket state,
including abandoned/cancelled/replayed uploads. No browser action is required.
Final objects not referenced by profiles use existing seven-day reconciliation
and durable deletion tombstones. Keep the worker running in apply mode; alert
on failure/old quarantine growth using the existing cleanup heartbeat/logs.

Validation attempts have a 30-second S3 deadline and a 90-second durable lease.
A crash can be retried after the lease if the original authorization has not
expired; otherwise initiate again. Every attempt uses a fresh destination, so
late operations cannot overwrite a published CV. Failed copies/ambiguous DB
commits can leave unreferenced objects until reconciliation. No synchronous
deletion of a possibly committed final object occurs on error. Replacement
retains existing cleanup behavior for old final objects.

## Controlled k6 runs

`capacity.js` is absent from current `dev`. Existing `event-readiness.js`,
staging-target guard, session format and cleanup are reused/adapted.
`tests/load/direct-cv.js` measures authorization, direct transfer, finalization,
total latency, successes, throughput, HTTP errors/timeouts and individual
business operations, including p50/p95/p99. No file bytes go to Next.js.

The ordered multipart encoder keeps the file part last. Transfers align at
3 seconds so concurrency can be verified from transfer start/end trends;
`cv_total_ms` excludes that deliberate alignment wait. Scenario iteration ids
allocate distinct synthetic scan/check-in pairs even when global VU ids interleave.

The fixture helper is deliberately local-only: it checks loopback DB/storage,
database name containing `direct`, and explicit confirmation. It provisions 40
upload students plus four companies/employees and 80 distinct scan/check-in
targets, persists its manifest, and removes only owned rows/objects on cleanup.
For shared staging, a maintainer must provision equivalent synthetic fixtures
and an explicit approved URL; do not run the local helper against shared DBs.

```bash
# Export all local app settings, including local AUTH_SECRET and S3 endpoints.
node --conditions=react-server --import tsx tests/load/direct-cv-fixtures.ts prepare
export E2E_BASE_URL=http://localhost:3000 STAGING_BASE_URL=http://localhost:3000
export CONFIRM_NON_PRODUCTION=yes E2E_ALLOW_UPLOADS=yes CONFIRM_SYNTHETIC_DATA=yes
export UPLOAD_FIXTURES="$PWD/tests/e2e/.staging-direct-cv.json"
export UPLOAD_PDF="$PWD/tests/e2e/.staging-direct-cv.json.pdf"
export UPLOAD_VUS=20 BUSINESS_VUS=4
export UPLOAD_SUMMARY=direct-cv-mixed-20.json
k6 run tests/load/direct-cv.js
node --conditions=react-server --import tsx tests/load/direct-cv-fixtures.ts cleanup
```

Run isolated cases A/B/C/D with `BUSINESS_VUS=0`, `UPLOAD_VUS=5/10/20/40`,
10 MiB payload; case E uses 20 VUs and a helper-generated `UPLOAD_SIZE_MIB=5`
payload. Run mixed cases at 5/10/20 uploads with four business VUs. Run a
business-only baseline with `UPLOAD_VUS=0`. Recreate/cleanup fixtures between
runs: scans/check-ins must create real unique associations, not return duplicate
errors. Allow the shared rate limit window to reset, or use fresh accounts.

For each interval capture existing private monitoring: per-web-replica CPU/RSS/
event-loop lag, MinIO PUT/COPY/GET errors/latencies, host disk writes/reads/await/
utilization, network throughput, PostgreSQL latency/errors/pool waits. See
[capacity metrics](capacity-metrics.md). A local Docker Desktop sample does not
represent the VPS. Raw k6 URLs contain tokens: retain aggregate summaries only,
avoid HTTP debug and unredacted raw metric exports.

Compare like-for-like business-only vs mixed runs and, where available, the
old transport on the same machine/fixtures/proxy. The historical 200-VU heavy
run (36 completed 10 MB uploads, 10.96% global errors, 30s timeouts) is context,
not a controlled baseline for these local measurements. Do not claim reduced
VPS I/O, capacity or latency from implementation alone.
