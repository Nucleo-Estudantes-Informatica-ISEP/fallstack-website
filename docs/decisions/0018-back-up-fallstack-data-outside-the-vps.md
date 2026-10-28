# 0018: Back up Fallstack data outside the VPS

Status: Accepted

Date: 2026-10-28

## Context

Task05-A1 (#465) found no scheduled shared PostgreSQL/MinIO backup or verified
failure delivery. The requester identified Tech User as owner, selected
Cloudflare R2, and requested code to reduce the risk of exceeding its included
usage. Shared data services must remain available to other NEI applications.

## Decision

Use one host systemd job for Fallstack's two PostgreSQL schemas and six MinIO
buckets, independent of the web deployment and seasonal worker lifecycle.
Encrypt logical database/object snapshots with age before uploading to a private
EU R2 Standard bucket. Run daily at 02:15 Europe/Lisbon; retain 30 verified
successful copies. Systemd failures, including resource limits/timeouts, trigger
email to Tech User through the existing NEI SMTP service.

The host job owns uploads so it can fail closed before approaching its storage
or request budgets. An unguarded Coolify upload schedule would bypass those
checks. There is no competing application deployment workflow.

## Consequences

- Backup credentials, request counters and staging files stay root-only on the
  host. Keep the decryption key outside the VPS as well; it is never in R2.
- Storage and request guards cover this job and dedicated bucket. Other account
  usage, separate clients, lost counters or compromised credentials are outside
  that bound; the code is not an account-wide billing cap.
- An over-limit or otherwise failed run preserves existing backups and alerts
  the owner. Backups resume only after the underlying problem is resolved.
- Database dumps are individually consistent. Live object copies and the two
  database dumps are not one cross-service transaction. A fully coordinated
  restore rehearsal and accepted data-loss/restore-time targets remain #464.
- This host job does not back up unrelated NEI applications, AuthNEI or Coolify
  itself. The [runbook](../operations/backups.md) records recovery requirements,
  live verification and limitations.
