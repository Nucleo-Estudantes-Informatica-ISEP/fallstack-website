# 0030: Opt in to single-connection account deletion

Status: Accepted
Date: 2026-11-08
Supersedes: [ADR 0028](0028-bound-runtime-postgres-pools.md) (one-slot Wallet deletion clause only)

## Context

The runtime accepts a one-connection request pool. ADR 0028 therefore rejects
all Wallet operations, including account deletion, before database work.
Revocation runs inside the user-lock transaction and can hold that sole
connection during sequential Google requests, each with a ten-second timeout.
Allowing deletion by default would expose all other requests, including session
lookups, to acquisition timeouts. Session lookups return null and protected
routes respond 401/403; other database requests can return retryable 503 responses.

## Decision

Keep the default admission limit of `min(2, PRISMA_CONNECTION_LIMIT - 1)`.
Allow one account deletion in a one-slot pool only when the operator explicitly
sets `GOOGLE_WALLET_ALLOW_SINGLE_CONNECTION_DELETE=true` (default `false`).
Issuance still requires at least two connections. Admission remains shared
across bundles in a Node process, as is the production Prisma client. Larger
pools retain the combined two-operation ceiling. A transaction-scoped PostgreSQL
try-lock also limits opted-in one-slot deletions across replicas; contention
returns 429 and leaves the account intact.

## Consequences

Operators can accept temporary request starvation to enable deletion on a
one-slot installation. This is not event-capacity approval: prefer at least two
slots, within the agreed cluster budget. A deletion can starve its replica during revocation. Other replicas can still
experience pool contention while competing deletions acquire their transaction.
Revocation failures still retain the
account, and issuance/deletion retain their existing transaction and auth rules.
Moving Google I/O outside that transaction requires a separate ordering design.
The rest of ADR 0028, including rollout and staging prerequisites, still applies.
