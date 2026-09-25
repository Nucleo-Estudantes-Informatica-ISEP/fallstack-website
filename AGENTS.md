# AGENTS.md

Short operational index for contributors and agents. Use the linked documents
for procedure and rationale.

## Start here

- [README](README.md): local setup and run commands.
- [Contribution workflow](docs/agents/contribution.md): issues, branches,
  commits, PRs, checks, releases, and deployment.
- [Architecture](docs/architecture.md): layer boundaries, HTTP conventions,
  authentication, and data ownership.
- [Architecture decisions](docs/decisions/README.md): discrete decisions and
  their history.
- [Database workflow](docs/database-workflow.md): Prisma migrations and local
  data operations.
- [Shared data](docs/SHARED_DATA.md): PostgreSQL, MinIO, and deployment setup.
- [Observability](docs/observability.md) and [security](docs/SECURITY.md).

`docs/architecture.md` is the canonical architecture path set by #292; this
repo keeps that short public path while using the template repo's
`docs/agents/` and `docs/decisions/` directories.

## Quick rules

- Branch from `dev`, open PRs into `dev`, and promote reviewed `dev` to
  production `main`. Follow the [contribution workflow](docs/agents/contribution.md).
- Keep routes thin: runtime Prisma queries belong in
  `src/application/repositories/`, orchestration in server-only
  `src/application/services/`, pure rules in `src/domain/`, and browser fetch
  wrappers in client-only `src/client/api/`. See
  [architecture](docs/architecture.md#layer-boundaries).
- Put named request Zod schemas in `src/schemas/`. Use `defineHandler` for new
  JSON routes and `httpClient` for new browser calls. Give new JSON error
  responses `{ error: string }` and explicit status codes. See
  [HTTP conventions](docs/architecture.md#http-conventions).
- Server secrets use `serverEnv`; `NEXT_PUBLIC_*` values use `clientEnv`.
  Keep `.env.example` and both schemas in sync.
- Reusable UI primitives live in `src/components/ui/`. Other components use
  `src/components/<PascalCaseName>/index.tsx`.
- `src/edition/` currently holds action names and seed actions plus branding.
  Company tiers and booth-to-action mapping are database-backed; do not add
  them back as edition constants. Sponsors, FAQ, and schedule are database-backed
  too.
- `SavedStudent` is unique per student and company, despite an
  employee-attributed primary key. Action QR scans check both JWT expiry and
  timestamp freshness; they have no one-time nonce. See
  [data ownership](docs/architecture.md#data-ownership) and
  [authentication](docs/architecture.md#authentication-and-short-lived-tokens).
- Keep unit tests next to code. Put integration and smoke tests under
  `tests/e2e/`. Run the checks and manual flow in the
  [contribution workflow](docs/agents/contribution.md#checks-and-test-first-work).

Do not run destructive local data commands against shared services. `pnpm wipe`
requires `NODE_ENV=development`; check the target database first.
