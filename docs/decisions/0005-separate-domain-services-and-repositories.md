# 0005: Separate domain, services, and repositories

Status: Accepted
Date: 2026-07-20
Source: [Service and repository introduction](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/9936e6e073bff95e66b33c6bc8dc9f8bf6027e5f), [domain move](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/1400dd58d3368490b1d59b12c8184fcfe6d793a4)

## Context

Database queries and business rules had lived in route files and general helpers, making authorization and data behavior hard to test independently.

## Decision

Keep routes thin. Put Prisma queries in `src/application/repositories/`, orchestration and transaction coordination in server-only `src/application/services/`, and I/O-free business rules in top-level `src/domain/`.

## Consequences

- Persistence changes stay behind repository functions, while services compose operations and domain rules can run without a database.
- Browser code must use client-safe modules instead of importing server services.
- Existing legacy helpers can move when touched; the boundary does not require a bulk rewrite.
