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
student deletion, expire and anonymize the deterministic object in the configured
class. Treat upstream 404 as already revoked; other upstream failures return 502
and retain the account. Missing or invalid configuration returns 503. Only an
explicit `GOOGLE_WALLET_NEVER_ENABLED=true` declaration with all credentials unset
allows deletion without revocation. Every non-Wallet dev, staging, or CI
installation must set that declaration explicitly; unset or empty defaults to
`false`. The declaration also disables issuance.

Serialize issuance and deletion with the same PostgreSQL user-row lock. Retain
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
across replicas. Different users can still occupy multiple connections, and slow
Google calls keep their admitted transaction open.

Revocation currently covers the configured class only. Before an edition changes
classes or credentials, operations must expire and anonymize old objects using
their original class and credentials. Automated cross-edition reconciliation and
bulk backfill are outside this change. Removing configuration or setting the
never-enabled declaration cannot replace that cleanup. Google synchronization
and pre-start/expired-pass display still require real-device verification.
