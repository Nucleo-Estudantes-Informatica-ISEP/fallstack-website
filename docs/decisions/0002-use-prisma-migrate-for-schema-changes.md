# 0002: Use Prisma Migrate for schema changes

Status: Accepted

## Context

The project previously used `prisma db push`, which left no versioned migration history. Existing databases required a baseline when migrations were introduced.

## Decision

Track schema changes in committed Prisma migrations. Generate changes with `prisma migrate dev` locally; apply pending migrations with `prisma migrate deploy` before the application starts. Resolve the baseline as already applied on databases whose tables predate it.

## Consequences

- Schema changes have reviewable migration files alongside application code.
- Deployments must apply pending migrations before serving traffic.
- Existing databases need the one-time baseline procedure in [`database-workflow.md`](../database-workflow.md).
