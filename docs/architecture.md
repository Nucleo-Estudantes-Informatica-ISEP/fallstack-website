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
- `src/client/api/` owns browser fetch wrappers and is client-only. Client
  components must not import server-only modules except through server actions.
- `src/lib/` still contains shared and server helpers that have not moved into
  those layers. Check each module's imports and `server-only` or `client-only`
  marker before using it across a boundary.

Prisma type-only imports outside repositories are fine. Runtime calls to
`prisma.*` belong in repositories.

## HTTP conventions

For JSON API routes, `src/lib/http/server.ts` provides `defineHandler`:
session/auth policy, optional Zod body parsing, optional ownership authorization,
handler execution, and error mapping in one place. The default strategy is
`session`. Role strategies include `student`, `employee`, `staff`, and `admin`.
Use `public` when a session may be attached and `none` to skip session lookup. An
ownership check belongs in `authorize` after the strategy passes (and only when
a session exists). Request
schemas live in `src/schemas/`. New route-authored failures use
`{ error: string }` with explicit HTTP status codes; the wrapper retains its
existing Zod issue response for parse failures.

Browser calls use the `httpClient` in `src/lib/http/client.ts` through
`src/client/api/`. Its typed non-2xx error carries the HTTP status; use `raw()`
for responses outside the JSON contract. This avoids repeating response and
error handling in components.

See `src/app/api/saved/route.ts` for strategies, `authorize`, and a schema in
one route; see `src/client/api/session.ts` for expected `HttpClientError` handling.

The wrapper is for JSON requests when `schema` is provided. Multipart upload
routes omit `schema` so `defineHandler` performs session authentication and role
authorization before the handler streams the multipart body with bounded memory
([ADR 0026](decisions/0026-bound-upload-memory-streaming-transport.md)). Health
probes that must avoid a session lookup use plain route exports. Keep their
exceptions local and documented.

CVs use JSON authorization at `/api/storage/cv`, browser-to-MinIO presigned
POST, and `/api/storage/cv/finalize`. Metadata parsing follows the shared rate
limit in the authorization route. Quarantine, conditional promotion and durable
owner-bound state are described in [ADR 0041](decisions/0041-direct-private-cv-uploads.md).
The legacy multipart transport remains for avatars/logos only.

## Authentication and short-lived tokens

[ADR 0055](decisions/0055-collect-company-code-before-sign-in.md) describes how the employee invite code is carried across sign-in.

Login uses AuthNEI/ZITADEL OIDC. The app signs its own session cookie, and
`getServerSession()` resolves the matching application `User` and profile.
PostgreSQL and MinIO store application data; neither creates login sessions.
Password recovery stays with the identity provider. New session cookies and JWTs
last twelve hours; attendance rights are bounded by the original signed issuance
time and any earlier preserved deadline (ADR 0047).
The exported bcrypt helpers (`hashPassword`, `comparePassword`, and
`validatePassword`) in `authService.ts` have no callers; there is no app-side
password login.

Short-lived JWTs from `src/application/services/authService.ts` serve QR and
temporary student-profile access, not login. The student's personal QR expires
after 30 minutes, profile preview access after 15 minutes, and action QR JWTs
after about 30 seconds. The action scan also checks the embedded timestamp's
freshness. It prevents stale QR use but has no nonce or one-time-consumption
check: a captured code can be reused during its valid window by another
student. A student's duplicate completion of the same action is rejected.

The employee-only `/api/students/token` endpoint also exchanges valid signed
`attendance` QRs for fifteen-minute `student-pass` tokens. It verifies HS256,
expiry, purpose and the current student record before minting; saving and profile
preview routes continue to require `student-pass`. Permanent-code passes use the
same existing employee lookup. Expired or tampered QRs cannot be exchanged.

Employee preview authorization, including the tokenless fallback and its
company-level saved-student check, is recorded in [ADR 0042](decisions/0042-restrict-tokenless-student-previews.md).

## Data ownership

`prisma/schema.prisma` is the source of truth for models and relationships.
Use it for the current data model; the [database architecture](database.md)
diagram and notes should be updated with schema changes.

Student saves reject the caller’s own student profile with HTTP 403 before
writing a save or awarding booth points, including admin saves. The caller’s
user ID is checked independently of the employee attributed to the save.

`SavedStudent` stores both an employee attribution and a company. Its primary
key is `(studentId, employeeId)` and a separate unique constraint on
`(studentId, companyId)` enforces one save per company. The service checks the
company before insert and handles a uniqueness race at the database boundary.
Admin saves skip the pre-insert company check; the unique constraint still
rejects a duplicate.

Schema changes use committed Prisma migrations. See the
[database workflow](database-workflow.md) for commands and existing database
baseline steps, and the [Prisma Migrate ADR](decisions/0002-use-prisma-migrate-for-schema-changes.md)
for the decision record.
