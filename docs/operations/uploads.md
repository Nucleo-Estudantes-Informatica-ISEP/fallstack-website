# Upload transport and validation

CV and avatar uploads remain authenticated same-origin multipart POSTs at
`/api/storage/cv` and `/api/storage/avatar`. Admin avatar/logo uploads use the
same lifecycle after admin authorization. See [ADR 0026](../decisions/0026-bound-upload-memory-streaming-transport.md).

## Limits and failure behavior

| Upload     | Allowed type | File limit | Student allowance   |
| ---------- | ------------ | ---------- | ------------------- |
| CV         | PDF          | 10 MiB     | 5/minute/account    |
| Avatar     | PNG/JPEG     | 5 MiB      | 5/minute/account    |
| Admin logo | PNG/WebP     | 5 MiB      | Admin authorization |

Allow 16 KiB for the multipart envelope. Exactly one `file` field is accepted.
The body is counted even without Content-Length. A false declaration is
rejected after reading; a declaration/body above the envelope cap returns 413.
An oversized file within that cap, malformed/truncated framing or invalid
MIME/signature returns 400. A timeout returns 408; rate-limit and Redis failures
retain 429/Retry-After and 503. Storage failures remain generic 500 responses.
An unsuccessful PUT never returns its id; retry by uploading again. No client
receives S3 credentials or a public CV URL.

Signature checks preserve the existing leading-byte validation; they are not a
PDF parser or image decoder. Interrupted transport is rejected even if its
initial bytes match a valid file signature.

`multipartUploadService` uses an OS temporary directory (0700), exclusive 0600
files and backpressure. The full request including PUT has a 60-second deadline;
failed PUT cleanup has its own five-second deadline. Normal paths remove local
files in `finally`. A crash/SIGKILL can leave `fallstack-upload-*` directories:
use an ephemeral container writable layer, or an OS-managed temporary volume
whose stale-file cleanup runs beyond the maximum request lifetime. Never delete
an active request's directory. Keep permissions private and monitor free space.
Do not mount a memory-backed tmpfs if the deployment goal is lower total RAM.

Budget at least `concurrent CVs * 10 MiB + concurrent avatars * 5 MiB` of writable
temporary space, plus operational headroom. Disk-full errors fail without a
storage attachment. MinIO is the durable store; a different replica never needs
this local path. Unattached MinIO objects still follow the seven-day grace and
[durable cleanup workflow](../storage-cleanup.md); retain its DB tombstones.

App Router upload routes consume the request stream directly; the Pages Router
`bodyParser.sizeLimit` setting does not control them. The API paths are excluded
from nonce middleware, avoiding a middleware body clone. Verify the deployed
Traefik/Coolify route has no buffering middleware, permits at least
`10 MiB + 16 KiB`, and allows the application's 60-second request deadline, up to five seconds of
failure cleanup and response overhead. A proxy may reject earlier with its own 413/timeout; test
through the public staging origin. Do not infer deployed proxy settings from a
successful local Node test.

## Repeatable local memory comparison

Start disposable loopback MinIO using the README's pinned image and synthetic
credentials. Supply `S3_ENDPOINT`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
securely in your shell, then run:

```bash
CONFIRM_NON_PRODUCTION=yes \
UPLOAD_EVIDENCE_PATH=/tmp/upload-memory.json \
node --import tsx tests/load/upload-memory.ts
```

The harness refuses remote endpoints, creates unique disposable buckets, deletes
its own uploads/buckets and temporary baseline module, and changes no database.
It imports the exact upload service from git revision `cc10dd8` by default;
`UPLOAD_BASELINE_REF` can select another compatible revision. Baseline imports
are rewritten only to resolve the same current storage/rate-limit adapters.

Two fresh native HTTP service hosts run sequentially with the same MinIO,
workload and SDK version. The driver/PNG encoder and streaming metering proxy
are outside the measured app RSS. Each host warms with one CV and one avatar,
forces GC before sampling, then receives four waves of eight concurrent requests
(half CV, half avatar), scheduled four seconds apart. `UPLOAD_CONCURRENCY` and
`UPLOAD_WAVES` accept 1..32 for additional experiments. Report actual duration
and check waves finish within four seconds before interpreting this as the same
offered rate. Payloads are a valid single-page near-10-MiB PDF with xref/trailer
and a decodable near-5-MiB synthetic PNG. No participant data is used.

RSS is sampled every 5 ms; p50/p95/p99 cover end-to-end HTTP upload latency.
The proxy counts actual MinIO PUT requests, wire bytes, non-2xx/errors and
throughput, including SDK chunk framing. Independent hosts verify SHA-256 after
reading baseline/changed uploads from shared MinIO. This host deliberately omits
Next/session/Redis overhead and does not establish authorized cross-replica
HTTP behavior. Run the authenticated checks below separately.

Local comparison gates: zero application/MinIO errors, every request produces
one successful PUT, byte-identical cross-process reads, lower changed peak RSS,
and p95 below the four-second wave interval. These are reproducibility checks,
not a production SLO or a recommendation to scale replicas.

## Staging acceptance for #417

Keep this deployment evidence separate from unit/service benchmarks:

1. Use synthetic Student sessions from distinct accounts against an approved
   non-production origin. Record commit, replica count, proxy limits, CPU/RAM,
   temporary filesystem and MinIO disk/network topology.
2. Run the same realistic near-limit CV/avatar offered load against baseline
   and changed Next builds, staying below each account's five/minute allowance.
   Capture each process/container RSS (and cgroup/cache separately), endpoint
   p50/p95/p99, status counts and MinIO throughput/errors. Confirm local staging
   files are removed after failure and interruption.
3. Exercise valid and invalid multipart, spoofed MIME/signature, missing/false
   Content-Length and disconnect during receive/PUT. Confirm failed uploads do
   not return attachable ids and cannot create a private CV reference. Observe
   orphan cleanup without shortening the grace period or deleting tombstones.
4. Upload through one replica; attach/read through another with the normal
   owner session. Unauthenticated downloads and another student's profile write
   must fail. Existing attachment semantics allow known shared UUID references;
   no per-uploader capability/expiry protocol is introduced by this transport.
5. Record capacity thresholds and a safe concurrency only for that measured
   deployment. Coordinate #419 before changing Coolify's literal replica counts.

## Local evidence — 4 November 2026

[Raw JSON](../evidence/task03-a-upload-memory.json) records the comparison against
`cc10dd8`, using Node 24.11.0 and the README's pinned MinIO image on a local
Linux host. Other local verification processes were active; treat timings as a
local sample rather than a production SLO. Each variant accepted 32 requests in
four identical waves of eight (four CVs/four avatars, every four seconds). The
PDF was 10,482,266 bytes and the PNG 5,157,965 bytes.

| Metric                                   |              Baseline |               Changed |
| ---------------------------------------- | --------------------: | --------------------: |
| Idle RSS after warm-up/GC                |             238.2 MiB |             166.6 MiB |
| Peak app-service RSS                     |             489.7 MiB |             198.9 MiB |
| Latency p50 / p95 / p99                  | 1757 / 3237 / 3238 ms | 1317 / 2426 / 2437 ms |
| Application / MinIO errors               |                 0 / 0 |                 0 / 0 |
| Successful measured PUTs                 |                    32 |                    32 |
| MinIO wire throughput over full interval |           17.25 MiB/s |           18.01 MiB/s |

Peak service RSS decreased by 59.4%; the growth above warmed idle RSS decreased
from 251.5 MiB to 32.2 MiB. All requests finished within the four-second wave
interval, and both independent-process reads matched SHA-256. The SDK adds
checksum/chunk framing to stream PUTs, so changed wire bytes are slightly higher
than payload bytes. All local gates passed at eight simultaneous uploads. This
is the verified local concurrency only; the staging steps above still determine
safe event concurrency through Next, Redis and the deployed proxy.

The authenticated local `pnpm dev` smoke used a separate migrated PostgreSQL
schema/database and disposable MinIO buckets. CV/avatar upload returned 201;
CV attachment and byte-identical private CV/public avatar reads returned 200.
Unauthenticated access returned 401, another student's private CV read 404,
cross-profile attachment 403, and spoofed-signature/oversized files 400.
Synthetic rows and uploaded objects were removed after the check. This does
not replace the production-proxy staging checklist.
