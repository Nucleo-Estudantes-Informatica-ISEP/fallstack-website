# 0002: Use Prisma Migrate for schema changes

Status: Accepted
Date: 2026-07-12
Source: [Prisma Migrate adoption](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/c37bc9d19b8ffe1082a7de322c1ed7688da4a53b)

## Context

The project previously used `prisma db push`, which left no versioned migration history. Existing databases required the `20260712000000_init` baseline when migrations were introduced.

## Decision

Track schema changes in committed Prisma migrations. Generate changes with `prisma migrate dev` locally. The Compose `migrate` service uses the `migrator` Docker target to run `prisma migrate deploy`; `web` waits for its `service_completed_successfully` result before starting. Resolve the baseline as already applied on databases whose tables predate it.

## Consequences

- Schema changes have reviewable migration files alongside application code.
- Deployments must apply pending migrations before serving traffic.
- Existing databases need the one-time baseline procedure in [`database-workflow.md`](../database-workflow.md).
