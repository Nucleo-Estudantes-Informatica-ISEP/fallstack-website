# Existing staging deployment rerun — 16 November 2026

Issue #604. This replaces the temporary-date diagnostic run at revision
`9428706…` as the requested deployment verification. The user explicitly selected
the existing `https://origin-d67e49.example.invalid` deployment, then authorized
changing its dates to 16–18 November for the run and reverting afterwards.

## Target and temporary changes

Source revision: `cc5731c794d4e22203375be44ef7afac8b694ae9`. The existing Coolify
development resource `resource-cb7e0b` retained its three web replicas,
networks, public routing, database, MinIO, Redis and resource settings. No separate
application resource or parallel test deployment was created. The build was
rolled across those existing container names. The load generator ran on an
external Mac, through the public HTTPS endpoint.

The only application-source change was temporary edition dates:
`startsAt=2026-11-16T08:30:00+00:00`, `days=[16,17,18]` and an added
`16 de Novembro` schedule title. Existing session day indices were temporarily
shifted by one to preserve their 17/18 November calendar dates; a synthetic
00:00–23:59 session covered today. All date/source/schedule changes must be
reverted after the test. No check-in authorization rule or server clock changed.

Temporary image: `fallstack-task604:cc5731c-window-16-18`, digest
`sha256:7fd8f08ea680a2010b1bd4a48800ba907d62374bff8cd4576a26b6cc86ae1af7`.
Production retained revision `04324637320f2fb200c46f14de5a3beb6e109cc6`.

## Durable storage configuration

Storage is the existing MinIO server. Cloudflare remains the DNS/HTTPS proxy;
Cloudflare R2 is not used. The user explicitly requested keeping S3 configured
in both environments after reverting dates. The newer staging redeployment had
reset Coolify's saved dev `S3_PUBLIC_ENDPOINT` to null; this was corrected in
Coolify's encrypted environment-variable model and verified on a fresh read.
Both dev and prod have saved runtime values:

- Dev: `https://origin-111aa7.example.invalid`.
- Prod: `https://origin-7b176b.example.invalid`.

The approved POST/OPTIONS-only MinIO routes and exact-origin CORS remain in
place. Staging's generated runtime `.env` and all three running web environments
were also corrected. Date rollback retains these endpoint settings. No
production application upgrade or production load/upload was performed.

## Preflight and validation

MinIO reported `fallstack-dev-cvs` private, unversioned, quota `0 B` (no configured
quota limit). Free disk before load exceeded the runbook's 7.5 GiB requirement;
see [preflight inventory](heavy-users-staging-rerun-2026-11-16/preflight.json).
Cleanup is restricted to the unique synthetic namespace and its uploads.

Two hundred synthetic accounts use unique `example.invalid` emails: 40 company
employees, 140 students and 20 staff. Cookies are minted inside staging with
normal signed session claims and never published. A synthetic action exercises
QR scanning; two students' uploaded CVs are saved by the dashboard company.

Staging smoke verified 184,320-byte and exactly 10,485,760-byte PDFs:
authorization 201, signed transfer 204, finalization 200, attachment 200,
download 200 and complete SHA-256 equality. Today's live session accepted a
check-in with 201.

A task-owned local PostgreSQL 16 database on port 54604 was initialized and
migrated; Prisma validation passed before checks. The full suite passed 241
files with 16 date-expectation failures across three files. After updating only
temporary date expectations, those files plus edition-date coverage passed
90 tests. Lint, typecheck and production build passed. The temporary image's
Docker build also passed. A local dev-server check of the check-in endpoint
returned the expected unauthenticated JSON 401; staging smoke verified the
successful authenticated path. Temporary local source/test changes were
restored, and local database/dev-server processes were stopped.

The installed development-build k6 v2.3.0 could not serialize the multipart
body. Its canary was rejected before full load. The official k6 v2.4.0
Darwin/arm64 binary (`dd9395906d`, Go 1.26.11), SHA-256 checked against the
vendor release checksum file, is used for the replacement canary and full run.
Signed-form exception logs from the incompatible binary are not published.

## Results and restoration

Pending execution and final cleanup verification.

## Dependency diagnosis and tuning plan

The retry log contains 192 signed-upload failures, all TCP resets from Cloudflare edge addresses (`104.21.x.x` and `172.67.x.x`) while posting to the MinIO hostname. The VPS-side five-way 10 MiB probe completed in 1.28 seconds; the Mac path before the fast-network retry took 25.5 seconds. MinIO remained healthy with no OOM/restart, so MinIO memory was not the cause of the observed resets. The valid retry still had 5.99% request failures and p95 failures across all authenticated groups.

A separate Traefik defect was found: the CDN alias router referenced `fallstack-staging-lb@file` while that service was unavailable to the dynamic configuration. The service definition was added to the alias file and `staging-fallstack.nei-isep.org/api/health` returned 200 afterwards. This was separate from the Cloudflare upload resets.

Recommended fixes, in order:

1. Run five-way 10 MiB probes through the public hostname and directly to the VPS. If only the proxied path resets, move signed POST uploads to a dedicated Cloudflare configuration or bypass proxying for that upload hostname while retaining MinIO and TLS.
2. Add per-request status/error metrics at the upload proxy and MinIO boundary, including Cloudflare/Traefik request IDs and upstream reset counts.
3. Keep the fixed CDN alias service definition and validate that every file-provider router references an existing service.
4. Re-run 40, 100 and 200 users only after the upload probe is stable; then tune PostgreSQL pool/queries, Redis limiter latency and web event-loop saturation from measured p95 data.
5. Treat the 200-user gate as passed only with HTTP failures below 1%, checks above 99%, p95 below 750 ms for the six light endpoints, and both CV size classes present.

MinIO's memory limit was raised to **10 GiB** after the run. Docker image/build-cache cleanup reclaimed approximately **11.7 GiB**; dangling-volume pruning reclaimed 0 B and shared volumes were preserved. Final staging and production health checks returned 200.
