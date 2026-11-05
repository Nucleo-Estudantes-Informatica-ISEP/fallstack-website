# 0027: Bound runtime PostgreSQL pools

Status: Accepted
Date: 2026-11-03
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
acquisition timeout. Validate overrides centrally (pool 1–3, timeout 1–10 seconds)
and apply them only to the runtime datasource, preserving direct migration
identity separation. Keep current literal single-replica deployment settings.
Give web/cleanup a 90-second stop grace and retain existing Next.js/worker signal
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

Wallet issuance and deletion share process-wide admission capped at the request
pool size minus one (two operations with the default three-slot pool). Excess
operations return 429 before DB access, preserving one slot for other requests
during slow Google I/O. This cap does not reserve connections for Wallet:
ordinary queries can occupy every request slot, so an admitted Wallet operation
can still exhaust Prisma's default two-second transaction `maxWait` and fail
with P2028. URL `pool_timeout` does not change that deadline.
A one-slot configuration admits no Wallet operations;
use at least two slots when Wallet issuance/deletion is needed. Pool
limits protect shared capacity but do not establish acceptable event latency.
Proxy removal/drain ordering still needs staging validation. No shared DB role
quota, global PostgreSQL setting, production restart or new pooler is introduced.
The runbook records the generic budget, repeatable isolated saturation/drain
checks, stop thresholds and a rollback that preserves finite pool limits.
