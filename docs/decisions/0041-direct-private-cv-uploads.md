# 0041: Upload private CVs directly to MinIO

Status: Accepted

## Context

CV multipart requests previously staged the whole document on the web replica's
disk before forwarding it to MinIO. All services share one VPS. Signup also
needs uploads before a Student profile exists. Existing attachment APIs checked
object existence but did not bind the upload to its owner.

## Decision

Use AWS SDK presigned POST with an exact `content-length-range`, content type,
bucket and server-generated quarantine key. Authorize with the existing shared
Redis limit. Store owner-bound authorization/state in PostgreSQL, independently
of any web replica. Use a separate public S3 origin for signing; internal S3
operations retain their private endpoint. Missing public configuration fails
closed. The former multipart CV endpoint becomes the JSON authorization API;
there is no automatic transport fallback. Avatars/logos keep their existing flow.

Finalization reads HEAD and at most 1,040 bytes through conditional ranges,
checks PDF magic/version/end marker, and copies inside MinIO with
`CopySourceIfMatch`. Each attempt has a fresh destination and a durable 90-second
lease. A compare-and-set transaction fences superseded attempts, records the
validated CV, associates existing profiles and completes their CV action.
Pre-profile uploads remain owner-bound `ready` tickets until signup consumes
them in its transaction, within 24 hours. Repeated finalization returns the same
id; attachment replay cannot restore a superseded CV or refresh retention.

All S3 I/O is outside DB transactions. Ambiguous commit/copy failures never
delete a possibly published destination; existing seven-day orphan
reconciliation reclaims unpublished copies. The existing cleanup worker also
removes quarantine objects after 24 hours, including recreations through
still-valid POST policies. Buckets must remain private and unversioned, and the
worker must run in `apply` mode after operator review.

## Consequences

- Normal CV upload bytes never traverse Node.js or `/tmp`. MinIO still shares
  disk/network with the app and DB. Quarantine-to-final copy has storage I/O;
  total physical I/O reduction is **not** assumed or guaranteed.
- Adds one Prisma model/migration and `@aws-sdk/s3-presigned-post`, the SDK's
  official POST policy signer. No new service or worker.
- Validation preserves all former server checks and adds extension, empty-file,
  real size, PDF version/end-marker and upload ownership checks. This is envelope
  validation, not full PDF semantic validation, antivirus or content sanitizing.
  A corrupt PDF body with a valid envelope can still pass, as with the old
  signature validator. Full parsing would require another explicit design and
  resource budget; no claim of malware scanning is made.
- POST policies are bearer authorizations and cannot be revoked individually.
  Cancellation stops finalization, but the quarantine key can be rewritten until
  expiry. It cannot change the copied final object.
- The pinned MinIO supports POST policies and conditional ranges/copies;
  per-bucket CORS returns `NotImplemented`. Use explicit global origins and
  existing Traefik middleware to restrict public methods/headers. See the
  [runbook](../operations/direct-cv-uploads.md).
- Old unattached CV ids are no longer accepted for new associations. Existing
  profiles/downloads remain valid. Deploy all clients and replicas together.
- Persistent tickets contain owner, size, state and identifiers, never filenames
  or file contents. They cascade with account deletion. They currently retain
  idempotency history for the account lifetime.
