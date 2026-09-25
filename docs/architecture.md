# Architecture

This page describes stable boundaries and why they exist. It is not a file-by-file
inventory. For decisions and their history, see the
[ADR index](decisions/README.md): in particular,
[edition tracking](decisions/0001-track-editions-in-one-repository.md) and
[Prisma Migrate](decisions/0002-use-prisma-migrate-for-schema-changes.md).

## Layer boundaries

App Router pages and API routes in `src/app/` handle transport and rendering.
They delegate data access and business work: a route should not query Prisma or
embed a domain rule. This keeps the same behavior available to different routes
and gives rules a useful test boundary.

- `src/application/repositories/` owns runtime Prisma queries. Services in
  `src/application/services/` orchestrate repositories and external services;
  they are server-only.
- `src/domain/` holds pure rules without I/O. Repositories can change without
  changing these rules, and rules can be tested without a database.
- `src/client/api/` owns browser fetch wrappers and is client-only. Shared
  types and UI remain outside the server-only dependency graph.
- `src/lib/` still contains shared and server helpers that have not moved into
  those layers. Check each module's imports and `server-only` or `client-only`
  marker before using it across a boundary.

Prisma type-only imports outside repositories are fine. Runtime calls to
`prisma.*` belong in repositories.

## HTTP conventions

For JSON API routes, `src/lib/http/server.ts` provides `defineHandler`:
session/auth policy, optional Zod body parsing, optional ownership authorization,
handler execution, and error mapping in one place. Strategies are `public`,
`session`, `student`, `employee`, and `admin`; `session` is the default. An
ownership check belongs in `authorize` after the strategy passes. Request
schemas live in `src/schemas/`. New route-authored failures use
`{ error: string }` with explicit HTTP status codes; the wrapper retains its
existing Zod issue response for parse failures.

Browser calls use the `httpClient` in `src/lib/http/client.ts` through
`src/client/api/`. Its typed non-2xx error carries the HTTP status; use `raw()`
for responses outside the JSON contract. This avoids repeating response and
error handling in components.

The wrapper is for JSON requests. Health probes that must avoid a session
lookup and multipart upload routes use plain route exports. Keep their
exceptions local and documented.

## Authentication and short-lived tokens

Login uses AuthNEI/ZITADEL OIDC. The app signs its own session cookie, and
`getServerSession()` resolves the matching application `User` and profile.
PostgreSQL and MinIO store application data; neither creates login sessions.
Password recovery stays with the identity provider.

Short-lived JWTs from `src/application/services/authService.ts` serve QR and
temporary student-profile access, not login. The student's personal QR expires
after 30 minutes, profile preview access after 15 minutes, and action QR JWTs
after about 30 seconds. The action scan also checks the embedded timestamp's
freshness. It prevents stale QR use but has no nonce or one-time-consumption
check: a captured code can be reused during its valid window by another
student. A student's duplicate completion of the same action is rejected.

## Data ownership

`SavedStudent` stores both an employee attribution and a company. Its primary
key is `(studentId, employeeId)` and a separate unique constraint on
`(studentId, companyId)` enforces one save per company. The service checks the
company before insert and handles a uniqueness race at the database boundary.

Schema changes use committed Prisma migrations. See the
[database workflow](database-workflow.md) for commands and existing database
baseline steps, and the [Prisma Migrate ADR](decisions/0002-use-prisma-migrate-for-schema-changes.md)
for the decision record.
