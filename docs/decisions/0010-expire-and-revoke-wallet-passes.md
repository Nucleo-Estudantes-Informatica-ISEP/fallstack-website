# 0010: Expire and revoke Wallet passes

Status: Accepted
Date: 2026-10-09
Source: [Issue #394](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/394)

## Context

Google Wallet objects can retain a student's name and permanent code after the
edition ends or the local account is deleted. Issuance racing deletion can
reactivate an expired object. Google failure must not silently discard the only
local account from which revocation can be retried.

## Decision

Send the edition's explicit validity timestamps on every issuance. Before local
student deletion, expire and anonymize the recorded object in its original class.
Commit a WalletPass identity before Google issuance I/O so a failed external call
or later DB rollback cannot lose the revocation target. Legacy unrecorded passes
fall back to the configured deterministic object; inventory/backfill before cutover. Treat an object 404 as already revoked only after an authenticated
GET confirms the targeted Generic Class exists and is accessible; a missing or
inaccessible class retains the account with 502. Other upstream failures return 502
and retain the account. Missing or invalid configuration returns 503. Only an
explicit `GOOGLE_WALLET_NEVER_ENABLED=true` declaration with all credentials unset
allows deletion without revocation only when no issuance marker exists; emit a
PII-free structured skip event. Every non-Wallet dev, staging, or CI
installation must set that declaration explicitly; unset or empty defaults to
`false`. The declaration also disables issuance.

Serialize issuance and deletion with the same PostgreSQL transaction advisory
admission lock and user-row lock. Competing instances fail fast with 429 before
waiting for the row lock. Retain
that lock during Google I/O to prevent reactivation after deletion. Admit only
one issuance or deletion per user in each process before database access; return
429 for competing requests. Always release admission on completion or failure.
Google calls have ten-second timeouts; interactive transactions have a sixty-second
limit. Translate network and timeout failures to sanitized 502 errors.

## Consequences

Deactivation remains a reversible local access gate: it denies new sessions and
issuance but does not revoke an existing pass. Account deletion performs the
Wallet anonymization and revocation. If revocation succeeds but local deletion
fails, issuance by the retained active account restores the pass, or the admin
can retry deletion.

Deletion depends on Google availability. Administrators can retry after fixing
upstream or configuration failures. The process-local admission guard protects
each Prisma pool from repeated same-user requests; row locks preserve correctness
across replicas, with shared advisory admission rejecting a concurrent same-user
operation. Different users can still occupy multiple connections, and slow
Google calls keep their admitted transaction open. The in-memory Set is only an early rejection optimization. Advisory admission
works across replicas after connection acquisition; it cannot prevent pool
saturation from different users or connection acquisition itself.

With a cold OAuth token, deletion can make three ten-second calls while locked
(OAuth, object PATCH, and class GET after a 404); issuance can make three locked
calls (object GET, insert, conflict PATCH), with OAuth before the transaction.
Thus slow calls can hold a connection for roughly 30 seconds, or up to the
60-second transaction limit including lock waits. If concurrent admitted users
reach Prisma's configured `connection_limit`, unrelated queries also wait and
can fail on `pool_timeout`; the per-user guard does not reserve pool capacity.
Prisma's transaction acquisition `maxWait` is separate from the transaction
limit. Keep event-scale deployment at one replica, monitor pool wait/timeout
errors and latency, and load-test the configured pool before adding replicas or
high-volume Wallet traffic. A durable per-user operation protocol is required
before moving Google I/O outside the lock; a DB-only recheck would permit a late
issuance PATCH to reactivate a deleted account's pass.

Revocation uses the recorded class/object even if configuration rotates. Issuance
refuses a different class while a marker exists. Before reclassifying an account,
operations must revoke/anonymize the old object with its original credentials,
then deliberately reconcile its marker. A different configured issuer fails
closed. Backfill pre-marker historical passes from the issuer inventory before
changing configuration; an empty marker table is not proof no legacy passes exist.
Automated bulk cross-edition reconciliation is outside this change. Removing
configuration or setting the never-enabled declaration cannot replace cleanup. Google synchronization
and pre-start/expired-pass display still require real-device verification.

The WalletPass migration must deploy before web health/traffic. Markers cascade
only when account deletion commits after successful revocation. A failed issuance
may leave a conservative marker without a Google object; normal 404 plus class
verification permits deletion. The PostgreSQL integration suite calls the real
admin route/services with mocked Google HTTP, including real FK deletion failure,
class rotation, preserved markers and the actual 502/503 response contracts.
