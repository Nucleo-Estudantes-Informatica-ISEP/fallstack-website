# Task01-F combined candidate verification — 14–15 November 2026

The performance gate remains open. Local validation and staging functional
checks passed, but **no fresh candidate capacity workload has run**. The
isolated stack was removed twice during preparation. PR #587 stays draft with
`Closes #453` until the measurements and performance gates pass. The
[22 baseline runs](task01-f-capacity-2026-11-14.md) describe an earlier revision.

## Candidate and environment

Application commit: `248b0623599c4b12412447720f79f3ef94f4c64b`.
Source tree: `d980907b903f63b1b96e8452916d3db4db0cb070`.
Production image: `sha256:d14c9c1194ea598a3ebb83a4ee0c87815e410795e4a9a5ec818299ca44d0391d`.
The remote Docker build used the unmodified Dockerfile and this exact tree.
Later changes through `71092caebbb6ec531709df02c89e41da92cfb356` affect the
workload, supervision, teardown and evidence, not the application image.

The candidate includes the merged final #589
(`600366391a14e8e10f19f9c441cd3e20da18d3de`) and #591
(`9144956e46db640a20124dcb6bf2ec57bb05d719`), including final UUID cursor
validation and the stale-response UI guard. The canonical index migration is
`20261114190000_index_saved_student_company_history`; the duplicate candidate
migration was removed before deployment.

The disposable `capacity453v3` project had three web copies, each capped at
**1 CPU / 768 MiB**, with two initially routed. PostgreSQL, authenticated Redis,
MinIO and cleanup had isolated data/credentials and no published dependency
ports. MinIO retained the baseline's final 1-CPU / 1-GiB budget; PostgreSQL,
Redis and cleanup each used 0.5 CPU / 256 MiB. Fixtures covered 600 students,
200 employees, ten companies and one live action, using only synthetic sessions.

`SHOWCASE_FULL_WEBSITE=true` enabled event pages. The baseline left this unset,
using the application's false default; preserve this content-mode difference
when comparing performance.

## Requested changes and evidence

| Item                    | Implementation and observed result                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Exact 10-MiB CV      | Upload routes bypass middleware body cloning; streaming size/deadline, auth and Redis limits remain. Handler responses retain the process instance header. Local near-limit (10,484,736 bytes) and exact-limit (10,485,760 bytes) PDFs upload 201, attach 200 and download byte-for-byte 200; wrong type/oversize return 400. Staging upload suite: four passed. Production middleware/upload headers identify the same process. |
| 2. History index        | Canonical migration indexes `(companyId, createdAt DESC, studentId DESC)`. Real PostgreSQL integration verifies the index and bounded page query.                                                                                                                                                                                                                                                                                |
| 3. Deletion-safe cursor | Timestamp/UUID value cursor, final upstream validation and stale-response protection. Real PostgreSQL coverage includes deleted cursors, ties, newer inserts and company isolation. Desktop/mobile pagination loads 15 then all 21 profiles without duplicates.                                                                                                                                                                  |
| 4. ISR failure/recovery | Production-server test expires the real TTL, revokes FAQ SELECT from a temporary read-only role, then restores access. Warm HIT 200; failed regeneration retains Portuguese HTML 200; cold English fails 500; both recover to updated HTML 200. Executed at `a00e8cd0b18e2fc9ecd488f97bea968caf299b12`; cache implementation unchanged in the deployed candidate, so evidence is reused. Temporary role, FAQ and server removed. |
| 5. Workload             | Explicit 307 language redirect then same-origin document. The 10% boundary group alternates near/exact CVs with separate completion gates. Six regressions pass; arrival, latency, error and operation gates remain unchanged.                                                                                                                                                                                                   |
| 6. Combined reruns      | Exact candidate built/deployed, with fresh AuthNEI/ownership supervision and ownership-checked teardown. Functional staging checks pass; fresh capacity/fault measurements and three-copy failure boundary remain pending after namespace removal.                                                                                                                                                                               |

## Validation

Checks used macOS, Node 24.21.0, Next 15.5.29 and a confirmed task-owned
PostgreSQL 16 database with both database URLs set. Migrations/Prisma validation
passed before application checks. Redis and MinIO were disposable.

- At application revision `248b0623`: **1,214 tests passed, four conditional
  skips**, 203 passing files and one skipped file. Lint passed with zero
  warnings, typecheck passed, production build passed with one worker.
- Remote production Docker build passed for the source tree above.
- Subsequent harness changes: six focused tests, targeted ESLint and typecheck
  passed. Supervisor self-check includes terminating an actual child process;
  teardown ownership rejection checks and Python compilation passed.
- Staging upload browser suite: **four passed in 51.9 seconds**. Staging
  cross-copy CV/privacy suite: **one passed in 2.8 seconds**. These establish
  functional behavior, not capacity.
- Desktop/mobile history pagination passed locally. The first desktop attempt
  hit its unchanged 30-second navigation timeout during cold development
  compilation; a warm rerun passed in 7.3 seconds. The existing mobile table
  remains cramped with long synthetic names.

The narrow **Capacity 453 staging public HTML** Cloudflare rule was enabled
only for the five public document URLs on `staging-fallstack.nei-isep.org`,
respecting origin TTLs and excluding queries, RSC/prefetch, authorization and
truncated headers. Preflight observed HTML HITs with identical anonymous and
authenticated bodies, no CSP nonce and no Set-Cookie. Private/session, RSC,
prefetch and query requests bypassed HTML caching. Root redirects remained
307/no-store; static assets reached HIT and both routed copy IDs were observed.
AuthNEI DNS and zone-wide TLS/security settings were unchanged.

## Interrupted test window

Sudo/systemd logs show explicit sampler shutdown,
`docker compose -p capacity453v3 ... down -v` and removal of
`/data/coolify/proxy/dynamic/capacity453v3.yaml` around **23:32 UTC on
14 November**, then again at **23:53:57 UTC** after the user authorized recreation.
The sampler stopped successfully; this was not an OOM. These removals deleted
isolated volumes and restored shared staging routes. The issuing session has
not been identified.

The `two-target-cdn` attempt at **23:39:42–23:39:43 UTC** exited 1 during
supervisor preflight because the resource sample was stale after removal.
Its report has `aborted: true`, `workload_exit: null`: **k6 never started**;
no offered load or performance result is claimed. The stack remained absent
at **00:11:13 UTC on 15 November**. The five staging URLs were subsequently
confirmed in Cloudflare's recently purged list to clear synthetic HTML.

Both staging hostnames temporarily served isolated data while the override
existed. Ordinary staging users could see synthetic content or have shared
sessions rejected. The user authorized testing and recreation; a stable window
without concurrent namespace cleanup is required to finish the matrix.

## Remaining acceptance work

1. Recreate only the isolated namespace, reseed, verify every copy's limits and
   readiness, start the sampler and repeat CDN/private-response preflight.
2. Run both targets on two and three copies, two-copy 80-user origin/CDN and
   three-copy 160/200-user CDN cases. Sweep three copies to a measured failing
   gate, retaining generator limitations and every failed attempt.
3. Run kill, drain and isolated Redis failures with fault/restoration proof.
4. Retain per-run p95/p99, full errors, separate 429s, mandatory operation/CV
   completion, copy/dependency/host resources and AuthNEI guard reports. Adjust
   budgets only when measurements justify it; repeat affected cases.
5. Retain an actual ownership-checked teardown dry-run and removal output,
   restore staging routing, clear synthetic edge content and restore the task
   rule's prior disabled state. Keep #587 draft until gates pass.

Interactive AuthNEI sign-in and installed-device PWA behavior were not tested.
Synthetic application sessions did not create or modify AuthNEI identities.

## Artifact retention

Playwright's old default output cleanup removed the ignored baseline archive.
Fifty baseline summary, metadata and resource/generator artifacts were recovered
and recompressed; the original complete HTTP sample files have no remaining
local copy. Committed measurements/hashes were not rewritten. Browser output
now uses `test-results/playwright/`; an actual subsequent browser run verified
all 50 recovered artifacts survived. New performance archives must remain
outside that browser output directory.
