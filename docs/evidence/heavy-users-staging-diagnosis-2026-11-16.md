# Staging transfer diagnosis and controlled reruns — 16 November 2026

> Historical report: status and requirements below describe that run. The later
> [multipart continuation](heavy-users-staging-multipart-2026-11-16.md) records the
> user-authorized temporary staging dates, subsequent validation, cleanup and PR status.

Issue #604; PR #610. This continues [the earlier tuned report](heavy-users-staging-tuned-2026-11-16.md).
**The original capacity gates remain failed.** No production load ran. All scenario runs used the existing three staging containers and their real PostgreSQL, Redis and MinIO dependencies. Storage stayed private and Cloudflare-proxied. No timeout, assertion, threshold, rate-limit policy or connection-pool ceiling was relaxed.

## Demonstrated findings and limits

1. **The 60-second proxy request-body deadline interrupts slow uploads.** At a controlled 131,072 bytes/s, an exactly 10 MiB PDF sent directly to the origin with the public Host/SNI received 499 after 60,171 ms and 7,815,168 bytes sent. The same slow transfer internally to MinIO received 204 after 80,313 ms with the complete multipart body. Installed Traefik help reports a default 60-second whole-request read timeout. Full-load MinIO traces contain partially received POSTs cancelled around 60 seconds. This demonstrates a binding proxy boundary, not a MinIO object-size rejection. The deadline was preserved; extending it would not fix bandwidth queueing.
2. **The Mac/network path contributes substantial delay.** All 64 initial matched public/direct-origin round trips passed SHA-256 equality: 180 KiB and exactly 10 MiB, each at 1/5/10 concurrency. Supplemental 10 MiB probes from the VPS completed ten-concurrent uploads within 1,203 ms and downloads within 831 ms; matched Mac probes took tens of seconds. Those VPS probes were diagnostic only; no capacity workload moved off the Mac. They used the same proxy, web and storage services. This establishes a path/generator contribution, not a specific Wi-Fi/ISP/edge fault. Host network samples cover shared traffic and cannot establish this Mac's available uplink capacity.
3. **Light-endpoint latency is predominantly outside measured Node handling.** In the final valid-fixture run, Node p95 was 413 ms for dashboard, 131 ms for history, 71 ms for QR, 128 ms for authorize, 112 ms for the combined CV lookup/attach category and 204 ms for check-in. End-to-end p95 still failed every original 750 ms gate. The combined CV category cannot establish a separate attach-only origin p95. Event-loop maximum was 154 ms during this run. Prisma sampled at most one waiting query, with three connections; cumulative sampled wait sum stayed below 974 ms per replica over thousands of waits. No evidence justifies larger pools or an authorization/session cache.
4. **Storage disk latency does not explain the multi-second light requests.** Final shared-host mean read await was 0.40 ms, write await 1.55 ms; peak sampled disk utilization was 33.5%. Proxy TCP send queues reached 93.1 MB and storage queues 10.5 MB. These namespace/shared-host samples show backpressure, but cannot assign a particular failed request to a socket. No private proxy access log existed. Enabling it would require changing the shared proxy; this continuation did not restart that service or log credentials/query strings.
5. **The isolated check-in 500 is localized upstream of measured Node, not diagnosed as an application exception.** It reproduced in the final run with a 21-byte response, no content-type/server header and no application JSON error marker. All three captured Node streams recorded no check-in 500/502/503 or unhandled application error during the interval. The final run also saw an 11-byte `Bad Gateway` check-in response. Storage 502 responses included Cloudflare's plain 16-byte error-code body. These facts distinguish response classes; they do not prove which intermediate component generated the check-in 500. Correlated proxy access/connection traces and, where applicable, edge request diagnostics remain necessary. Client reset/status alone is not a root cause.

Cloudflare documents [diagnostic error headers](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-error-headers/) and [edge/origin status distinctions](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-502-504/). The captured error responses did not supply those diagnostic headers. No Cloudflare service fault is claimed.

## Corrections made

The reused private fixture generator inserted session activity translations as `pt`/`en`, while the current domain parser requires `PT`/`EN`. It caused a logged homepage-schedule ZodError. The generator now uses canonical keys and rejects an invalid translation shape before load. This is a fixture correction, not evidence that the check-in 500 was fixed.

The launcher now enforces deployment identity, health, zero restarts/OOMs and the free-space guard inside the same process before starting k6. An earlier shell command incorrectly continued after a failed disk assertion; that attempt was stopped and is explicitly labelled aborted below. Manifest retirement and recovery verify exact synthetic ownership and original schedule mappings. No bucket-wide hash-only orphan deletion was used.

No production source change was justified by the measured origin performance. Existing Redis recovery, streaming/cancellation and proxy-publication fixes were retained without duplication. Signed-download architecture, bounded polling and DB query redesign were not added without evidence that they would address the measured boundary.

## Protocol and comparability

All runs below used revision `783afa3fe79e713654e61d969c816bb3459a76cd`, with a temporary diagnostic image and 16–18 November date window. Temporary-only instrumentation added Node request/event-loop telemetry and Prisma metrics; no schema migration. The normal-image snapshot was preserved before each swap.

Official k6 2.4.0 ran on the same Mac/network. Scenario source, size plan, thresholds and pacing remained unchanged: proportional 20% dashboard / 70% QR / 10% staff, 60 s ramp, 180 s hold, 30 s ramp down, 15 s upload interval. Corrected runs imported that unchanged scenario through a wrapper that recorded only sanitized failed-response metadata. The wrapper preserved request arguments and response identity; assert-based checks and `k6 inspect` passed. This diagnostic generator change is disclosed; it did not retry requests or modify thresholds.

Each completed run started with a fresh namespace: 200 synthetic accounts, two saved students with seeded CVs (180 KiB and exactly 10 MiB), zero check-ins and zero synthetic action completions. Fresh accounts prevent previous allowance/history/check-in state carrying forward. Runs remain sequential network measurements, not a randomized performance experiment. Preliminary runs used malformed session translations and are retained as diagnostic evidence, not acceptance evidence. Runtime request telemetry for corrected 40/100 runs was lost when another authorized deployment replaced the containers; final-run logs were captured externally and retained.

The deployment changed concurrently while preparing the last retry. Its latest normal revision was snapshotted and preserved. With explicit user approval, staging auto-deploy was paused with a ten-minute automatic restoration timer, and idle build cache was reclaimed within approved selection bounds. The final measured replicas stayed at the diagnostic image with no restart/OOM. Auto-deploy was restored after the run.

## Results

Original gates: HTTP failures <1%, checks >99%, and each of six light endpoints p95 <750 ms. Every completed run below exited 99 and failed all six latency gates. Boolean threshold values in legacy k6 JSON are failure flags: `true` means failed.

All rows use revision `783afa3f`; `P` means preliminary invalid session fixture, `C` corrected fixture, `A` aborted. Upload counts are real-size/exactly-10-MiB; download counts are successful checked downloads. Near-limit scenario bytes are exactly 10,485,760, not an approximate substitute. Counts exclude the two fixture-seeding uploads.

| Run                     | Users | Requests | HTTP failures | Checks passed | CV uploads real / 10 MiB | Downloads | Check-ins new / duplicate |
| ----------------------- | ----: | -------: | ------------: | ------------: | -----------------------: | --------: | ------------------------: |
| run-40 (P)              |    40 |    2,949 |    15 (0.51%) |        99.53% |                 208 / 36 |       522 |                 140 / 164 |
| run-100 (P)             |   100 |    4,378 |    91 (2.08%) |        97.62% |                 309 / 24 |       624 |                 140 / 587 |
| run-200 (P)             |   200 |    5,817 |   187 (3.21%) |        95.99% |                 391 / 16 |       630 |                140 / 1197 |
| corrected-40 (C)        |    40 |    2,901 |    15 (0.52%) |        99.52% |                 192 / 35 |       531 |                 140 / 159 |
| corrected-100 (C)       |   100 |    4,736 |    93 (1.96%) |        98.01% |                 240 / 15 |       843 |                 140 / 599 |
| aborted-budget-200 (A)  |   200 |    4,274 |   135 (3.16%) |        95.19% |                 345 / 18 |       281 |                 140 / 862 |
| corrected-200-final (C) |   200 |    6,157 |   204 (3.31%) |        95.16% |                 449 / 18 |       612 |                140 / 1275 |

Endpoint p95 in milliseconds; original limit is **<750 ms** for every column.

| Run                 | Dashboard | History |     QR | Authorize | Attach | Check-in |
| ------------------- | --------: | ------: | -----: | --------: | -----: | -------: |
| run-40              |     2,578 |   1,610 |  1,852 |     1,373 |  1,671 |    2,512 |
| run-100             |     3,288 |   2,277 |  2,934 |     2,354 |  3,041 |    3,637 |
| run-200             |    15,687 |   3,315 |  6,275 |     4,623 |  4,746 |    5,616 |
| corrected-40        |     2,510 |   1,482 |  1,719 |     1,566 |  1,418 |    2,000 |
| corrected-100       |     3,284 |   2,183 |  2,150 |     2,061 |  2,080 |    3,120 |
| aborted-budget-200  |    12,487 |   2,740 | 10,286 |     3,939 |  3,951 |    4,124 |
| corrected-200-final |    12,446 |   3,540 | 13,643 |     4,090 |  3,876 |    4,412 |

The aborted row is not a completed 200-user result. The final valid-fixture row is the comparable retry requested here; it still fails capacity. Detailed JSON contains endpoint/status/protocol histograms, CV group/size counts, raw summary metrics, dates and checked fixture state. No request URLs, cookies, signed URLs or internal resource identifiers are published.

## Verification

- Task-owned isolated local PostgreSQL connectivity confirmed, migrations applied, Prisma schema validated before checks; local DB was stopped afterwards. Node 26.13.1, pnpm 10.23.0.
- Josimar's unchanged `tests/load/heavy-users.test.ts`: **64/64 passed** at `783afa3f` in this continuation. Vite emitted its existing config-loader warning; no test failed or was skipped in this file.
- Temporary diagnostic image production build passed, including type validation. Existing formatter warnings were reported; they were not suppressed. Diagnostic source changes were confined to private build context and were removed with the image.
- Real-size and exactly 10 MiB PDF authorize/transfer/finalize/attach/download passed SHA-256 equality in bounded probes. Every fresh fixture also passed the two-size integrity smoke and a live 201 check-in before resetting initial state.
- Scenario dashboard/history, QR pass, action QR/action scans, CV transfers and live check-ins were exercised; individual failed checks remain in JSON. SSO login and camera/PWA interaction were not exercised by this API workload.
- Unchanged application runtime reuses the prior full suite (1,683 passed / 27 skipped) and hosted CI at `783afa3f`: [CI run 43933040755](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/actions/runs/43933040755). Those are previous inspected results, not a new local full-suite execution.
- The separate all-repository-history security scan's four findings remain disclosed and unsuppressed. No unrelated history or security configuration was rewritten. The current contribution's commit-range scan and documentation validation are recorded with the final PR update.

## Cleanup and restoration

Every namespace was removed between runs. The final namespace removed 200 users/relations and verified 1,052 ticket-owned keys absent. A final cross-run registry checked **5,406 strongly owned keys** with HEAD 404, zero student references and zero owned upload tickets; zero late objects needed removal. Completed deletion-audit rows belonging only to those keys were removed. No unreferenced object was deleted merely because it had a common synthetic hash. Existing unrelated objects were preserved.

All 200 final synthetic session cookies returned 401. Remaining synthetic-user count is zero. Normal schedule is restored to nine day-one and seven day-two entries. The concurrent normal deployment was retained and restored at revision `244b753cafb784062d843424092a02e77ee4cb72` on all three healthy replicas, with S3 retained. This supersedes the initial normal snapshot; reverting it would overwrite another deployment. Durable dev/prod S3 configuration and MinIO's persisted 10 GiB limit were verified. Cloudflare storage proxy remains enabled.

The diagnostic image, task backup containers, temporary MinIO client credentials, sampler/log-collector processes and local PostgreSQL were stopped or removed. Shared data volumes, running unrelated containers and images in use were preserved. Initial prune filters matched nothing; corrected exact-ID cache pruning was subsequently verified, and both no-op and effective results are retained. Approved cache selections were below 4 GiB and then 8 GiB; selected bytes are an upper bound, not a claim of equivalent filesystem recovery. Shared image layers and concurrent activity make filesystem deltas differ.

See `final-resource-cleanup.json`, `final-restored-deployment.json`, `final-objects-cleanup.json`, `final-database-postflight.json`, `auto-deploy-restored.json`, `durable-config.json` and cache evidence for exact state. Final free disk after cleanup was **19,158,274,048 bytes (17.84 GiB)**; it is a point-in-time value on a shared VPS.

## Remaining blockers

No capacity pass is claimed. The measured proxy upload-body deadline and path backpressure remain; resolving them without longer timeouts needs a separately designed transfer/concurrency strategy or a generator/network with demonstrated headroom. The unexplained upstream check-in 500 needs sanitized proxy-level correlation. Those changes cannot be asserted as fixed by caching, new signed-download endpoints or larger database pools. The unauthenticated public storage readiness path returned 503, while the container health check remained healthy. This path was not counted as proof of object-service availability; authorized object round trips are the transfer evidence. Staging and production web health each returned 200. The bucket-policy SDK inspection was denied to the application credential; administrative MinIO checks independently confirmed a private bucket and no configured quota.

The PR remains draft with its Development relationship to #604 and closing claim retained; the unresolved gate is explicit.
