# 0008: Reconcile MinIO retention with durable deletions

Status: Accepted
Date: 2026-10-08
Source: [Issue #389](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/389)

## Context

The Supabase SQL jobs cannot delete objects after the move to shared PostgreSQL
and MinIO. CV retention must remove references and bytes, preserve referenced
avatars/CVs, and recover safely from failed S3 deletes or interrupted runs.

## Decision

Run a separate worker through the existing Coolify Compose deployment, after the
migrator succeeds. Audit at startup and daily at 03:00 UTC; deletion requires
explicit `apply` configuration. Expire CV references after six calendar months
and consider scoped UUID objects orphaned only after a 48-hour upload grace period.

Commit reference changes and durable `StorageDeletion` claims before S3 deletion.
Short table locks serialize claims with media writes; attachment triggers reject
claimed keys permanently. Retry pending deletes through the existing S3 service,
then record completion. Require never-versioned buckets so successful deletion
removes bytes. Keep unknown upload ages and unrecognized objects for investigation.

## Consequences

No new scheduler dependency, public endpoint, or competing deployment pipeline is
needed. Dry runs and structured logs expose operator failures; container health
tracks completed passes independently of data warnings and individual failed deletes.
Failed deletes leave inaccessible objects queued until retry succeeds. Completed
claims remain as tombstones; restoration requires a new key.

Full bucket listings and brief locks suit the current event scale. Larger buckets
or media-write contention require streaming reconciliation and a per-key registry.
Each pass handles at most 1,000 expired references and 1,000 deletion attempts;
operators can rerun to drain a backlog. See the [runbook](../storage-cleanup.md)
for permissions, rollout, audit, monitoring, and recovery.
