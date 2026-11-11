# 0028: Bound runtime PostgreSQL pools

Status: Superseded by [ADR 0030](0030-opt-in-single-connection-deletion.md) (one-slot Wallet deletion clause only)
Date: 2026-11-03
Amends: [ADR 0024](0024-separate-liveness-and-dependency-readiness.md) (the readiness `SELECT 1` runs on its own one-connection pool, not the request pool); [ADR 0027](0027-readiness-checks-and-graceful-shutdown.md) (drain timeout 25s to 65s, web stop grace 45s to 90s)
Source: [Task02-A #414](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/414)

## Context

Prisma 6.19.3 uses a separate Rust-engine pool per Node process. The deployed
host exposes six CPUs; an isolated copy logs a default 13-connection pool even
under a one-CPU Docker quota. The shared PostgreSQL cluster has 100 connections,
three superuser-reserved slots and other applications sharing ordinary slots.
Four Fallstack web/cleanup pairs could demand 104 connections before rollout,
migrations or administration. Idle current connections underestimate that risk.
The current `googleWalletService.ts` calls `withLockedUser` around
`syncGenericObject`; `userRepository.ts` implements that helper with a Prisma
transaction and a 60-second timeout. Google I/O therefore already holds a
connection in this revision; no future branch is assumed. Cleanup adds
independent pools. A pooler cannot remove that transaction occupancy.

## Decision

Bound runtime request pools to three connections, readiness to a separate one,
cleanup and standalone seed/wipe/test fixture clients to one, with a five-second
acquisition timeout. Validate overrides centrally (pool 1–10, default 3, timeout 1–10 seconds)
and apply them only to the runtime datasource, preserving direct migration
identity separation. Keep current literal single-replica deployment settings.
Give web/cleanup a 90-second stop grace. Integrate the web lifecycle handler
from [ADR 0027](0027-readiness-checks-and-graceful-shutdown.md) with a 65-second
drain timeout to cover the existing 60-second Wallet transaction deadline;
disconnect both request and readiness pools after draining. Retain worker signal
handling so work drains before process exit/disconnect.

Budget every environment/resource, worker, transient job, overlapping rollout,
other consumer and administration reserve using the
[connection runbook](../operations/postgres-connections.md). Budget four slots
per web copy (three request slots plus one readiness slot), including rollout
copies. Keep tenant inventory and negotiated allowances in private operator
records. Recalculate and agree the whole-cluster budget before rollout; an
observation is not an enforced quota or a measured peak. Scaling remains gated
on #411 capacity and #419 deployment/drain checks.

Keep direct PostgreSQL. Initial isolated measurements show bounded pools,
expected finite saturation failures and connections returning to baseline;
there is no production evidence yet requiring PgBouncer. Revisit based on
measured capacity/churn or a changed shared-cluster allowance. A later pooler
change needs transaction/session/prepared-statement compatibility tests, direct
migration validation and a new decision record.

## Consequences

Wallet issuance and deletion share process-wide admission capped at two
operations, or the request pool size minus one when that is smaller (two with
the default three-slot pool). The cap does not grow when the pool is raised, so a
larger pool cannot let more slow Google calls pin request slots. Excess
operations return 429 before DB access, preserving one slot for other requests
during slow Google I/O. This cap does not reserve connections for Wallet:
ordinary queries can occupy every request slot, so an admitted Wallet operation
can still exhaust the transaction `maxWait` and fail with P2028. `withLockedUser`
sets that wait to `PRISMA_POOL_TIMEOUT_SECONDS` because URL `pool_timeout` does
not change Prisma's two-second default. P2024 and P2028 are logged and returned
as a retryable 503 rather than a generic 500.
A one-slot configuration admits no Wallet operations;
use at least two slots when Wallet issuance/deletion is needed. Pool
limits protect shared capacity but do not establish acceptable event latency.
Proxy removal/drain ordering still needs staging validation. No shared DB role
quota, global PostgreSQL setting, production restart or new pooler is introduced.
The runbook records the generic budget, repeatable isolated saturation/drain
checks, stop thresholds and a rollback that preserves finite pool limits.

## Measured evidence (2026-11-07)

Measured on the shared development deployment: three web copies built from the same commit, behind one Traefik load balancer, with one cleanup worker per copy. One k6 load generator ran from a single laptop. Uncapped runs used commit `10a3078`; capped runs used `5e6bf4a` (this ADR's change). Database connections were sampled once per second from `pg_stat_activity`; transaction rates come from `pg_stat_database` and are averaged over the whole sampling window, so they understate the peak. Development holds only synthetic data.

| Run                                         | Config | Result                                                                                                                   |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Homepage and session, 10 users, 3 min       | no cap | 0% core failures, homepage p95 514-555 ms; about 4 transactions/s; at most 2 connections per copy                        |
| QR scan rush, 10 users, 60 s                | no cap | 48 scans/s, p95 189 ms; 4 connections per copy                                                                           |
| QR scan rush, 25 users, 60 s                | no cap | 89 scans/s, p95 353 ms; 7-8 connections per copy; cluster peak 25 above baseline                                         |
| QR scan rush, 25 users, 60 s                | cap 3  | 116 scans/s, p95 231 ms; 3 connections per copy; at most 2 busy at once; cluster peak 11 above baseline                  |
| Mixed: homepage 10 users and scans 25 users | cap 3  | scans 54/s, p95 476 ms; homepage p95 653 ms; 0 errors, 0 `503`; 3 connections per copy; web copies at 43-90% of one core |

A scan is one public `GET` for the QR token plus one authenticated `POST` that completes the action, about six statements per scan. The scenario used 200 live actions and 25 synthetic students.

What the runs show:

- Without a cap, a copy opened as many connections as it had requests in flight (4 at 10 users, 7-8 at 25). That tracks request concurrency, not database work: at most two connections were busy at the same instant.
- With the default cap of 3, a scan rush of about 39 scans/s per copy (116/s across three copies) produced no pool wait errors, no `503`, and no slower responses than the uncapped run.
- In the mixed run, scan throughput halved and scan p95 doubled, while the database-backed light requests (session lookup, cached public data) did not slow down. Total request rate stayed near 200/s in both the scan-only and the mixed runs. The web copies ran at 43-90% of one core. This points to application CPU, not the connection pool, as the shared ceiling.

Limits of this evidence: single runs, one load-generating laptop sharing a home connection, a development host, and no Google Wallet traffic or CV uploads. The cause of the throughput ceiling (application CPU, the load balancer or the load generator) is not proven. #411 and #419 still own the event capacity target, the number of copies and the per-copy CPU sizing.

Decision unchanged: keep the request pool default at 3, adjustable up to 10 with `PRISMA_CONNECTION_LIMIT`. Raise it only when a capped run shows pool wait errors or `503` responses. Wallet admission stays capped at the smaller of two operations and the request pool size minus one per process, so a larger pool cannot let more than two slow Google calls pin request connections.
