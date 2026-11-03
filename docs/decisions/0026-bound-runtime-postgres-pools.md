# 0026: Bound runtime PostgreSQL pools

Status: Accepted
Date: 2026-11-03
Source: [Task02-A #414](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/414)

## Context

Prisma 6.19.3 uses a separate Rust-engine pool per Node process. The deployed
host exposes six CPUs; an isolated copy logs a default 13-connection pool even
under a one-CPU Docker quota. The shared PostgreSQL cluster has 100 connections,
three superuser-reserved slots and 26 observed connections from other apps.
Four Fallstack web/cleanup pairs could demand 104 connections before rollout,
migrations or administration. Idle current connections underestimate that risk.
Wallet transactions can hold a connection across Google calls for up to 60s;
cleanup adds independent pools. A pooler cannot remove that transaction occupancy.

## Decision

Bound runtime web pools to three connections, cleanup to one, with a five-second
acquisition timeout. Validate overrides centrally (pool 1–3, timeout 1–10 seconds)
and apply them only to the runtime datasource, preserving direct migration
identity separation. Keep current literal single-replica deployment settings.
Give web/cleanup a 90-second stop grace and retain existing Next.js/worker signal
handling so work drains before process exit/disconnect.

Budget every environment/resource, worker, transient job, overlapping rollout,
other consumer and administration reserve using the
[connection runbook](../operations/postgres-connections.md). Its current-resource
allowance totals 70 of 97 ordinary slots; the conditional seven-web-process
envelope totals 79. Other apps' allowance of 40 is an operator coordination
requirement, not an enforced quota or a measured peak. Scaling remains gated
on #411 capacity and #419 deployment/drain checks.

Keep direct PostgreSQL. Initial isolated measurements show bounded pools,
expected finite saturation failures and connections returning to baseline;
there is no production evidence yet requiring PgBouncer. Revisit based on
measured capacity/churn or a changed shared-cluster allowance. A later pooler
change needs transaction/session/prepared-statement compatibility tests, direct
migration validation and a new decision record.

## Consequences

Slow different-user Wallet operations can saturate a small per-process pool;
finite acquisition failures provide backpressure and must be monitored. Pool
limits protect shared capacity but do not establish acceptable event latency.
Proxy removal/drain ordering still needs staging validation. No shared DB role
quota, global PostgreSQL setting, production restart or new pooler is introduced.
The runbook records measured consumers, repeatable isolated saturation/drain
checks, stop thresholds and a rollback that preserves finite pool limits.
