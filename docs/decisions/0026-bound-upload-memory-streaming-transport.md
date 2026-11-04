# 0026: Bound upload memory with streaming multipart transport

Status: Accepted
Date: 2026-11-04
Source: [Issue #417](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/417)

## Context

CV uploads (PDF, up to 10 MiB) and avatar uploads (PNG/JPEG/WebP, up to 5 MiB)
allow 16 KiB multipart envelope overhead and are rate-limited to 5 uploads per
minute per authenticated student via [ADR 0025](0025-share-upload-rate-limits.md).

The previous upload path accumulated raw request chunks into an array, used
`Buffer.concat` to build a single multipart buffer, passed it to `Request.formData()`
for parsing, and then called `file.arrayBuffer()` before calling S3 `PutObjectCommand`.
This caused up to 4x whole-file buffer allocations (~40 MiB heap per 10 MiB CV).
Under concurrent event traffic, multiple parallel uploads produced severe peak RSS
spikes and elevated process out-of-memory risk.

Direct-to-MinIO presigned uploads were evaluated against bounded multipart streaming.
As documented in [SHARED_DATA.md](../SHARED_DATA.md) and
[ADR 0011](0011-reconcile-minio-retention-with-durable-deletions.md), MinIO runs
strictly on an internal Coolify Docker network (`http://minio:9000`) without a public
host port. Direct browser uploads to MinIO would require exposing MinIO publicly,
managing external TLS and CORS, and increasing attack surface. Furthermore, CSP
in production restricts storage communication to same-origin routes.

## Decision

Retain same-origin multipart uploads through the application routes, but replace
whole-body buffer accumulation with **bounded multipart streaming directly to MinIO**:

1. **Pre-processing authorization and rate limiting**:
   Routes check session authentication and enforce the shared Redis rate limit
   ([ADR 0025](0025-share-upload-rate-limits.md)) before reading or consuming any
   request body bytes.

2. **In-flight byte limit enforcement**:
   - `Content-Length` headers are checked upfront. Mismatched, non-numeric, or
     declared values exceeding `maxSize + 16 KiB` are rejected immediately with 413.
   - For missing or falsified `Content-Length` (e.g. chunked transfer), the incoming
     request body is wrapped in a byte-counting `TransformStream`. If cumulative
     bytes exceed the limit, the stream is aborted immediately with status 413.

3. **Zero-copy magic byte validation**:
   Magic byte verification reads only the leading 16 bytes via `file.slice(0, 16).arrayBuffer()`,
   allocating negligible memory while verifying signatures for PDF, PNG, JPEG, and WebP.

4. **Streaming to object storage**:
   `uploadFile` streams the file content directly into MinIO using `putObjectStream`
   with `Readable.fromWeb(file.stream())` and the declared `ContentLength: file.size`.
   No whole-file `arrayBuffer()` is created in application code; memory is bounded
   to standard network chunk buffers (~64 KiB).

5. **Failure and orphan cleanup coordination**:
   - Keys are generated as random UUIDs (`distribution/cv/<uuid>.pdf` and
     `distribution/avatar/<uuid>`).
   - If an upload is aborted, disconnected, or fails during storage PUT, the stream
     is destroyed and a best-effort `deleteObject` is issued immediately.
   - If a failure cannot be deleted immediately (e.g. process crash), the object
     remains unattached in PostgreSQL and is safely reclaimed by the daily
     `storageCleanupService` ([ADR 0011](0011-reconcile-minio-retention-with-durable-deletions.md))
     after the 7-day upload grace period.
   - CV attachment (`POST /api/students/[code]/cv`) authorizes student profile ownership
     (`session.student?.code === params.code`) and verifies that the object exists in
     storage before attaching it to the student record. Cross-user attachments are rejected.

## Consequences

- Peak application RSS under concurrent upload traffic is reduced from ~40 MiB per
  file to bounded stream chunk sizes plus undici's internal parser footprint.
- MinIO remains private to the internal container network; no S3 credentials or
  internal endpoints are exposed to the browser.
- Multi-replica consistency is preserved: any web replica writes to shared MinIO and
  reads via existing `/api/media/avatar/<id>` and `/api/students/<code>/cv/file` endpoints.
- Integration with ADR 0011's durable deletion claims, attachment guards, and
  retention workflow is maintained without schema migrations.
