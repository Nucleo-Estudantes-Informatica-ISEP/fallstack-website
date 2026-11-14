# Task01-F combined candidate verification — 14 November 2026

The performance gate remains open. This candidate implements the requested code
changes and local regression coverage; it has **not** been deployed or measured
against the staging capacity matrix. PR #587 stays a draft with `Closes #453`.
The [original measurements](task01-f-capacity-2026-11-14.md) describe the earlier
application revision and do not establish this candidate's capacity.

## Candidate

Application commit: `a00e8cd0b18e2fc9ecd488f97bea968caf299b12`.
It integrates public HTML caching from #589 at
`3270a696ae53268291273e5cf377bbf8764db85f` and the pagination changes from #591 at
`d1fa8fb382cfc3b28724c52cb863d7ffa7806e93`. Both original PR branches are unchanged.

| Requested item                            | Implemented change                                                                                                                                                                          | Evidence                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Exact 10-MiB multipart CV              | Upload endpoints bypass middleware body cloning; existing streaming size, deadline, auth and Redis limits remain enforced. Route responses retain a consistent per-process instance header. | Actual authenticated Next development server and disposable PostgreSQL/Redis/MinIO: 10,484,736-byte and 10,485,760-byte valid PDFs upload with 201, attach with 200 and download byte-for-byte with 200. Wrong type and oversize return 400. Production-server check confirms middleware and upload headers identify the same process. |
| 2. History query index                    | Migration adds `(companyId, createdAt DESC, studentId DESC)`.                                                                                                                               | Applied to isolated PostgreSQL 16; repository integration test verifies the installed index and bounded 16-row query.                                                                                                                                                                                                                  |
| 3. Deletion-safe cursor                   | Client sends `createdAt` and `studentId`; schema validates both; repository compares values rather than locating a cursor row.                                                              | Real PostgreSQL test covers deletion, equal timestamps, newer inserts and company isolation. Route tests cover 400/401/403. Desktop and mobile Chromium load 15 initial profiles, then all 21 with no duplicates and no remaining load-more button.                                                                                    |
| 4. ISR failure/recovery                   | Opt-in test starts the actual production build with a temporary read-only database role, warms Portuguese HTML, expires the real 60-second TTL, revokes FAQ SELECT, then restores it.       | Warm HIT 200; failed regeneration serves STALE/retained last-good HTML 200; uncached English page returns 500; both languages recover to 200 with changed content. Temporary role, FAQ and server were removed.                                                                                                                        |
| 5. Homepage load harness                  | Checks the explicit 307 language redirect, then visits `/event/pt` or `/event/en`; automatic redirects stay disabled.                                                                       | k6 harness regression passes. Existing arrival, latency, error and operation gates remain unchanged.                                                                                                                                                                                                                                   |
| 6. Combined staging deployment and reruns | Ready for host deployment; no limits were relaxed without new measurements.                                                                                                                 | **Blocked:** SSH to `92.222.128.99:22` repeatedly returns `Connection refused`, including both user-requested retries. HTTPS health remains 200.                                                                                                                                                                                       |

## Local validation

Run on macOS with Node 24.21.0, Next 15.5.29, a confirmed task-owned local
PostgreSQL 16 database, authenticated disposable Redis 7.4.12 and a disposable
MinIO container. `DATABASE_URL` and `DIRECT_URL` pointed only at that database.
Migrations and Prisma validation succeeded before application checks.

- `NODE_ENV=test pnpm test --maxWorkers=1`: **1,213 passed, 4 skipped** across
  201 passing files and one skipped file. Existing conditional tests were not
  represented as executed.
- `pnpm lint`: passed with six existing warnings in unchanged files.
- `pnpm typecheck`: passed; repeated after changes to integration/browser tests.
- `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=2048 pnpm build`: passed.
- `RUN_ISR_RECOVERY=yes pnpm exec tsx tests/e2e/isr-recovery.ts`: passed against
  that production build, with real permission failure and recovery.
- Authenticated upload browser suite: **4 passed**, including near/exact limits,
  complete downloads and rejection cases, against `pnpm dev` on loopback.
- Company history browser test: desktop and mobile Chromium both passed. The
  first desktop attempt exceeded its unchanged 30-second navigation timeout
  during cold development compilation; its warm rerun passed in 7.3 seconds.
  Functional pagination passed; the existing narrow-screen history table still
  has cramped/overlapping text with these long synthetic names.
- Targeted ESLint/Prettier checks passed for new test scripts and configuration.
  The small PDF fixture was independently accepted by `pdfinfo` as a one-page PDF.

The production build predates only test/documentation/output-retention changes;
application code is unchanged since that successful build and ISR run. No
performance conclusion is inferred from these local checks.

## Staging preparation and remaining work

The existing Helium session successfully accessed Cloudflare. A disabled rule
named **Capacity 453 staging public HTML** was saved for
`staging-fallstack.nei-isep.org` only, matching the exact public HTML allowlist
and excluding queries, RSC/prefetch, truncated headers and authorization.
Edge and browser TTLs respect origin headers. It is deliberately **disabled**
until the candidate's public responses are verified; it is not evidence of
active CDN HTML caching. The DNS proxy and existing staging pool were unchanged.

After host access is restored:

1. Build/deploy the exact combined candidate into isolated staging dependencies
   with CPU and memory limits on every copy; verify migration and readiness.
2. Verify anonymous/authenticated public HTML, private/RSC bypasses and
   Cloudflare MISS/HIT behavior, then activate the narrow staging rule.
3. Run both targets on two and three copies, the two-copy 80-user case, CDN
   160/200-user cases and a three-copy sweep until a measured gate fails.
4. Run the kill, drain and Redis outage scenarios with fault/restoration proof.
5. Retain p95/p99, status/operation counts, 429s, all required successful CV
   round trips and per-copy/dependency/host/AuthNEI resources. Preserve failed
   attempts and generator limitations. Adjust budgets only when measurements
   justify them, then repeat affected cases.
6. Restore original staging routing and remove only task-owned test resources.
   Keep #587 draft until the agreed gates actually pass.

No live CDN, fresh event-host load/failure measurements, installed-device PWA or
real AuthNEI sign-in were claimed by this local verification. Synthetic signed
application sessions were used only against isolated local data.

## Artifact retention

Playwright's previous default cleanup removed the ignored baseline raw-sample
archive. Fifty remaining baseline summaries, run metadata and resource/generator
artifacts were recovered and recompressed; the original complete HTTP sample
files have no remaining local copy. The baseline report now states this gap;
its committed measurements and hashes were not rewritten.

Browser output now lives in `test-results/playwright/`. A subsequent actual
browser-suite run verified that all 50 recovered performance artifacts survived.
Future raw performance evidence must stay outside that browser output directory.
