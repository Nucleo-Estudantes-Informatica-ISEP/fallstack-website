# 0046: Resume private CV uploads in checksummed parts

Status: Accepted

## Context

The #604 staging measurements demonstrate interrupted request bodies at the
proxy's 60-second read deadline. An exactly 10 MiB upload at 128 KiB/s failed
through the proxy but completed directly to MinIO. The user authorized resumable
uploads, scoped image/cache retention and sanitized proxy correlation. Increasing
timeouts or weakening the original capacity thresholds is not the solution.

## Decision

Keep the existing signed POST protocol for existing callers and the unchanged
#601 workload. New browser CV uploads use an authenticated multipart initiation
route, the same fail-closed five-per-minute ticket allowance, and sequential
parts of at most 5 MiB. A separate fail-closed 60-per-minute part-signing allowance
bounds signature requests without consuming another upload ticket.

Persist MinIO's multipart identity on the existing owner-bound ticket. Derive
keys, part numbers, exact byte lengths and expiry on the server. Sign each PUT's
length and SHA-256 checksum; only the application session's owner can request
signatures. Retry an interrupted part at most twice, with backoff, while retaining
accepted parts. This resumes within the current upload attempt; it does not store
PDFs or bearer URLs in browser persistence or resume after a page reload.

Finalization acquires the existing fenced validation lease, lists parts through
the private S3 connection, verifies exact part count/size/checksums and completes
inside MinIO. Existing HEAD, conditional ranges, PDF-envelope validation,
conditional promotion, transactional ownership/attachment and no-replay behavior
remain. A lost completion response is retried against the completed quarantine
object; a cancelled or missing upload is not accepted as complete. All S3 I/O
stays outside database transactions.

Cancellation aborts incomplete parts. The existing cleanup worker also lists and
aborts only canonical quarantine uploads older than 24 hours, including uploads
left by failed ticket creation or account deletion. Listing failures stop cleanup;
no unrelated bucket/prefix or referenced distribution object is swept. Extend the
restricted S3 identity only with multipart list/abort permissions for the existing
CV bucket and quarantine prefix. Keep storage private, Cloudflare enabled,
aggregate CV limit 10 MiB and the existing MinIO memory limit.

## Consequences

Two 5 MiB transfers can complete under the request deadline where one 10 MiB
transfer cannot. This improves recovery, not aggregate network capacity. Preserve
and report the original workload separately from multipart diagnostics; no pass
is claimed by changing its transport or thresholds. Browser CORS must allow PUT
and the checksum header on the exact quarantine object path before rollout.

Host retention protects every container-referenced image, the newest three images
per explicitly approved repository, and every volume. Idle build cache is
reclaimable; unattached data volumes still require ownership/content/backup proof.
Proxy logs keep status, timing, byte counts and a process-local request sequence;
URLs, query strings, headers, addresses and backend identifiers are dropped before
writing. Existing bounded log rotation remains enabled.
