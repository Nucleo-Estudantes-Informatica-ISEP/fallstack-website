# 0026: Bound upload memory with streaming multipart transport

Status: Accepted
Date: 2026-11-04
Amended by: [ADR 0033](0033-sanitize-svg-logo-pipeline.md) for bounded SVG logo parsing; raster/CV streaming remains unchanged.
Source: [Issue #417](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/417)

## Context

CV uploads accept PDF up to 10 MiB; avatars accept PNG/JPEG up to 5 MiB;
admin logos accept PNG/WebP up to 5 MiB. The multipart envelope allowance is
16 KiB. Student uploads retain five requests/minute per account and kind through
[ADR 0025](0025-share-upload-rate-limits.md).

The baseline (`cc10dd8`) retained incoming chunks, concatenated the multipart
body, parsed it with `Request.formData()`, then copied the file through
`arrayBuffer()` before S3 PUT. Replacing only the input with a TransformStream
still leaves `formData()`'s full-file allocation. The baseline and replacement
are measured in the [upload runbook](../operations/uploads.md); buffer-copy
counts alone cannot establish peak RSS.

Direct browser uploads would require a publicly reachable MinIO endpoint,
TLS/CORS configuration and a separate scoped issuance/completion protocol.
Current MinIO is internal to the shared Docker network. Retain the existing
same-origin multipart endpoints and their response contracts.

## Decision

Use Busboy to stream exactly one `file` part to a private temporary directory,
then stream that validated file to MinIO with an exact ContentLength.
`multipartUploadService` owns parsing and staging lifetime; `uploadService`
owns MIME/signature checks and storage orchestration; `objectStorageService`
owns S3 commands. Routes authenticate and enforce rate limits before invoking
this lifecycle.

- Count actual body bytes regardless of Content-Length. Reject invalid or
  oversized declarations with 413 before consumption; reject a completed body
  whose count differs from its declaration with 400. The envelope cap is
  `maxFileSize + 16 KiB` (413); the file cap remains the existing 400 contract.
- Reject extra files, text fields, wrong field names and incomplete multipart
  framing with 400. Busboy and Node pipelines propagate disk backpressure;
  no `formData()`, whole-file `arrayBuffer()` or concatenation runs in the app.
- Preserve the allowed MIME types and existing leading-byte signature policy.
  Capture only 16 signature bytes while writing. This checks file signatures,
  not full PDF/image structure or malware. Reject invalid signatures before PUT.
- Generate a fresh UUID/key only after staging and validation. Local paths and
  filenames never derive from client input. Directories use `mkdtemp` isolation;
  files use exclusive creation and mode 0600.
- Bound parsing and PUT together to 60 seconds. Pass the request abort signal
  through disk pipelines and the AWS SDK; client disconnects fail with 400
  when a response can still be delivered, and deadline expiry returns 408.
- A complete staged file allows one PUT with known size and bounded buffers.
  Failures do not return an id. Destroy the file stream and await best-effort
  deletion with a separate five-second deadline, including a lost PUT response.
  Retry through a new authenticated HTTP upload with a fresh key; do not replay
  an already-consumed stream. No resumable upload authorization is issued.
- Always remove staging on success, validation failure, interruption, timeout
  and storage failure. A process crash can leave temporary files; follow the
  runbook's disk provision/restart guidance. Temporary files are never durable
  storage and are not needed by other replicas.

## Cleanup and attachment contract

Successful objects live only in shared MinIO. Existing private CV download
policies and profile-ownership authorization remain unchanged. Attachment checks
object existence and uses the existing database guards against queued/deleted
keys, including races. Do not bypass or remove durable deletion tombstones.

The transport does not issue presigned URLs, expiring upload tokens or client-
chosen keys. The existing attachment API treats a known UUID as a reference;
it does not prove who originally uploaded that UUID. Cross-profile writes are
forbidden, while existing shared references remain supported. This ADR does not
introduce a per-uploader ownership registry or claim that one exists.

If immediate object deletion fails, the unattached key follows
[ADR 0011](0011-reconcile-minio-retention-with-durable-deletions.md)'s seven-day
orphan grace and durable cleanup workflow. Only fully received, validated PUTs
return usable ids. No schema, retention or public-storage permission changes.

## Consequences

Memory no longer scales with whole-file copies in the application upload path.
RSS still includes framework, SDK, allocator and network buffers; temporary
files also consume disk/page cache. Provision bounded temporary disk separately
from the JavaScript heap. The extra disk write/read trades I/O for memory.

Local real-MinIO evidence demonstrates reduced service-process RSS and shared
object reads through independent processes. It does not establish production
capacity or Coolify multi-replica readiness. Repeat authenticated Next.js load
through the deployed proxy with production-equivalent resources before claiming
that event concurrency is safe; see the runbook and #419.
