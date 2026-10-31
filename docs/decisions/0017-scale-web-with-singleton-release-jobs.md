# 0017: Scale web with singleton release jobs

Status: Accepted
Date: 2026-10-28
Source: [Task04-B #459](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/459)

## Context

Duplicating a complete environment stack duplicates migration jobs and storage
cleanup daemons against the same DB/buckets. Horizontal deployment is tracked
in #419; stock Docker Compose verification does not establish Coolify support.
This complements [ADR 0002](0002-use-prisma-migrate-for-schema-changes.md).

## Decision

One Compose resource per environment owns one migration job and one cleanup
daemon. Every new web container and cleanup wait for the same migration's
successful exit. Only web may be scaled in the future; production configuration
currently pins web, migration and cleanup to literal `replicas: 1`, with no
`WEB_REPLICAS` environment knob. The smoke uses an explicit stock-Compose
`--scale web=3` override against disposable marker containers.

Singleton ownership is **operator-enforced**, not a distributed lock or hard
Compose limit. `--scale` overrides `deploy.replicas`; duplicate projects also
bypass the counts. Operators must serialize releases, keep one resource per
environment, and never scale migration/cleanup or start extra cleanup daemons.

Before a reviewed configuration change enables multiple web copies, #419 must:

- Verify the deployed Coolify version, generated Compose and container names
  with two staging web copies, one migration and one cleanup daemon. Injected
  per-service `container_name` may prevent scaling; this remains unverified.
- Replace the in-process counters in `src/lib/rateLimit.ts` with shared atomic
  enforcement under #413; N copies can allow up to N times the configured
  per-key budget.
- Resolve the per-copy invalidation policy in
  `src/application/services/publicDataCache.ts`: other copies can serve stale
  public data for the 60-second TTL. Explicitly accept/test that bound or add
  shared invalidation if stricter freshness is required.
- Replace or validate shared Wallet admission before pool acquisition:
  `activeWalletOperations` in `src/application/services/googleWalletService.ts`
  is process-local. DB user-row locks still serialize admitted transactions,
  but other copies can consume connections while waiting; validate the pool
  budget and concurrent issuance/deletion behavior under #414.
- Verify proxy/readiness/draining, identical immutable builds and Server Action
  keys, session/QR/media flows across copies, and rollback compatibility; select
  the replica count from #411 measurements and #414 connection budgets.

## Consequences

- A mistaken `WEB_REPLICAS` environment value cannot enable unverified scaling.
- Stock Compose tests prove release ordering and default counts, not Coolify
  rewriting, cross-project exclusion or application safety with multiple copies.
- Scaling remains disabled until the concrete prerequisites above are closed;
  migrations must stay compatible with already-running older containers.
- [Release operations](../operations/release-workers.md) define verification and
  the operator restrictions that keep cleanup at one daemon per environment.
