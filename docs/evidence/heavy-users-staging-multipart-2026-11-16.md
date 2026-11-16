# Staging multipart recovery and host retention — 16 November 2026

Issue #604 / PR #610. The user authorized temporary staging dates, the existing
three-container staging deployment, scoped host cleanup, and subsequent merge.
The issue requires running and reporting the unchanged authenticated workload;
performance success is a separate claim. **No capacity pass is claimed.**

## Demonstrated boundary and fix

The earlier controlled 10 MiB single-request upload at 128 KiB/s was cut off by
the origin proxy at 60.171 seconds; direct MinIO completed at 80.313 seconds.
Client resets alone did not establish this cause. See the
[previous diagnosis](heavy-users-staging-diagnosis-2026-11-16.md).

New browser uploads use owner-bound, short-lived signatures for sequential parts
of at most 5 MiB, with SHA-256 and exact length bound into each signature. Only a
failed part is retried, at most twice. Finalization validates stored parts and
retains the existing PDF envelope, ownership, fenced lease, private promotion and
transactional attachment checks. Cancellation and the existing retention worker
abort incomplete uploads. Aggregate limit remains exactly 10 MiB. No longer
proxy deadline, weaker threshold, larger pool or speculative authorization cache.

There were 66 verified multipart upload/download round trips using 180 KiB and
exactly 10 MiB PDFs: public and direct-origin paths at 1, 5 and 10 concurrent
transfers, plus two controlled slow retry probes. Every completed download
matched SHA-256. Public part p95 is not a capacity gate. The first origin/10 probe
without bounded retries aborted on a second-part transport failure; the repeat
with the browser's retry policy completed. That initial failure is retained in
[JSON evidence](heavy-users-staging-multipart-2026-11-16/initial-probe-failure.json).

At 128 KiB/s, each 5 MiB part completed in approximately 40.9 seconds through both
Cloudflare and directly to origin. Intentionally interrupting part two after about
256 KiB did not resend part one; retry completed and the final private download
matched. Full records: [multipart probes](heavy-users-staging-multipart-2026-11-16/multipart-probes.json).
This demonstrates recovery under the existing deadline, not more aggregate
network capacity or page-reload resume.

## Comparable original-workload runs

All runs below retain #601's signed POST protocol, role proportions, 60-second
ramp / 180-second hold / 30-second ramp-down, fixtures and original thresholds:
HTTP failures <1%, checks >99%, and all six light endpoint p95 values <750 ms.
Fresh fixtures contain 200 synthetic accounts, two saved CVs (180 KiB / 10 MiB),
zero check-ins and zero action completions before each proportional run.
Generator remains this Mac/network on Wi-Fi, official k6 2.4.0. No active wired
adapter was available. Only a sanitized response-metadata wrapper surrounds the
unchanged scenario; no requests, timing policy or thresholds were changed.

p95 columns below are milliseconds, in order: dashboard / history / QR /
authorize / attach / check-in. CV uploads show total (exactly 10 MiB subset);
all remaining accepted workload uploads are 180 KiB. Downloads show successful
checked transfers; per-group counts are in adjacent JSON. Check-ins show fresh /
expected duplicate-409 counts.

| Revision   | Users | Requests | HTTP failures | Checks passed | Light endpoint p95 (ms)                    | CV uploads (10 MiB) | Downloads | Check-ins fresh / duplicate |
| ---------- | ----: | -------: | ------------- | ------------- | ------------------------------------------ | ------------------- | --------: | --------------------------- |
| `783afa3f` |    40 |    2,901 | 15 (0.52%)    | 99.52%        | 2510 / 1482 / 1719 / 1566 / 1418 / 2000    | 227 (35)            |       531 | 140 / 159                   |
| `783afa3f` |   100 |    4,736 | 93 (1.96%)    | 98.01%        | 3284 / 2183 / 2150 / 2061 / 2080 / 3120    | 255 (15)            |       843 | 140 / 599                   |
| `783afa3f` |   200 |    6,157 | 204 (3.31%)   | 95.16%        | 12446 / 3540 / 13643 / 4090 / 3876 / 4412  | 467 (18)            |       612 | 140 / 1275                  |
| `11c359a2` |    40 |    2,269 | 22 (0.97%)    | 99.08%        | 2673 / 2145 / 2822 / 1987 / 1957 / 2475    | 145 (11)            |       421 | 140 / 160                   |
| `11c359a2` |   100 |    2,661 | 86 (3.23%)    | 96.48%        | 10109 / 6387 / 6300 / 6850 / 5564 / 7936   | 72 (0)              |       431 | 140 / 468                   |
| `11c359a2` |   200 |    3,576 | 355 (9.93%)   | 87.60%        | 16646 / 13365 / 7485 / 8138 / 3226 / 10134 | 21 (0)              |       297 | 140 / 904                   |

The first three rows are previous corrected-fixture runs. New runs use source
archive revision `11c359a2`, temporary 16–18 November dates and sanitized Node /
Prisma instrumentation. That unpublished source commit was subsequently rebased
only to correct a harmless test literal flagged by Gitleaks. Its multipart runtime
files are byte-identical to `740f420f`; no unrelated or previously pushed history
was rewritten. Later `dev` homepage/language changes are covered by merged-tree
local checks, not retroactively attributed to these load measurements.

## Local validation and rollout boundaries

Confirmed task-owned loopback PostgreSQL was migrated and Prisma-validated before
checks. Disposable loopback MinIO and authenticated Redis were enabled. At merged
revision `f1ac8336`: 1,773 tests passed / four skipped, 257 files passed / one
skipped; lint passed with ten warnings and no errors; typecheck and production
build passed. Josimar's unchanged 64 scenario tests are included. Real MinIO CV
integration passed 17 tests; maintenance Python tests passed three. Dev smoke
returned expected JSON 401 for all three protected multipart/finalization APIs.
Task-owned local PostgreSQL, MinIO, Redis and dev server were stopped afterwards.

An initial full run had seven failures because an integration storage mock omitted
the new methods; after correction, all 26 affected cleanup integration tests passed
and the subsequent merged full run passed. Gitleaks initially flagged a harmless
non-quarantine test path; simplifying that fixture in only unpublished task
commits made the 17-commit PR-range scan clean. No exclusion was added. The prior
full-history scan's four unrelated findings remain; no suppression or unrelated
history rewrite. Affected storage tests reran 17/17 after that fixture-only edit.

The new staging migration is nullable and backward-compatible. A first migration
attempt correctly failed using the runtime database role; its failed record was
recovered and the migration applied through the existing dedicated migrator
owner connection. Database credentials/permissions were not changed.

Public staging PUT/OPTIONS is restricted to canonical quarantine UUID paths;
exact-origin CORS grants the checksum header. Foreign origins receive no grant;
list, delete, foreign-bucket and distribution PUT probes get no matching public
route. MinIO remains private and Cloudflare-proxied, with its persisted 10 GiB
memory limit and no bucket storage quota. Staging-only IAM adds multipart metadata
listing for the CV bucket and part-list/abort for quarantine objects. MinIO
rejects prefix conditions on the bucket-level multipart-list action; no other
bucket permissions were added. Configure the equivalent scoped production
permissions and PUT/CORS route before promoting this protocol to production.
No production application release or load test occurred.

## Disk retention and proxy tracing

The final retention allowlist includes verified web, migrator and cleanup-worker
repositories belonging to the inspected Fallstack projects. Protect every
container image reference, including stopped containers, and the newest three
images per repository. Never delete volumes or containers. The web-only first
allowlist missed large service images; expansion removed 28 older tags and
restored more than 24 GiB free before the new load runs.

Idle shared cache was reclaimed through native Docker/BuildKit APIs. An existing
inactive builder was bootstrapped solely for native cache GC and stopped again;
its state volume remains. Unattached MongoDB, PostgreSQL and unidentified upload
data were preserved. The daily timer targets 20 GiB free, bounds each cache
selection and exits failed if it cannot meet the target. Inventory races retry
before mutation. Concurrent unrelated builds repeatedly consumed headroom; each
load launcher enforces >17 GiB free inside the process before sending load.

The proxy now drops all fields/headers by default and keeps only status, timing,
byte counts and a local request sequence. Canary query/header values are absent;
existing 10 MB x three-file log rotation remains. During initial proxy Compose
recreation, manually attached application networks were dropped and health
returned 503. Every snapshotted network/alias was restored and both web health
probes returned 200. The runbook now requires preserving those attachments;
later storage routing changes used dynamic reload without a proxy restart.
Shared proxy/host aggregate counters include unrelated traffic and cannot alone
attribute a specific failure to this application.

## Cleanup, restoration and remaining limits

Multipart-probe cleanup removed 200 accounts; all 175 owned object keys returned
HEAD 404 and all 200 revoked session cookies returned 401. Normal schedule was
restored before the next fresh namespace. Final progressive-run cleanup and
restoration are recorded in the adjacent final verification JSON.

Physical camera/PWA operation and SSO login were not tested. Capacity claims
remain governed by the original thresholds, with remaining failures reported
above. Detailed proxy / Node / MinIO correlation and final restoration totals
follow in the completion supplement below.
