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
