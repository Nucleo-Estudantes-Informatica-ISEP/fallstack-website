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

## Mandatory for every task

- Branch from `dev` as `<type>/<short-kebab-case-description>` with the matching
  Conventional Branch type (`feat/`, `fix/`, `docs/`, `chore/`, etc.).
- Use Conventional Commits: subject under 72 characters, no AI co-author
  trailer, and separate commits for unrelated concerns.
- Push the branch and open its PR into `dev`, never `main`. Promote reviewed
  `dev` to `main` through a release PR.
- Run the checks and manual flow in the
  [contribution workflow](docs/agents/contribution.md#checks-and-test-first-work).

## Quick rules

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
  `tests/e2e/`. Vitest auto-discovers `*.test.ts` and `*.test.tsx`.
- `src/config/` holds config, `src/utils/` generic helpers, `src/edition/`
  current event constants, and `src/hooks/` and `src/contexts/` React state.
- Check PWA or service-worker changes on a real device or installed PWA.

Common commands: `pnpm dev`, `pnpm test`, `pnpm test:watch`, `pnpm lint`,
`pnpm typecheck`, `pnpm build`, `pnpm generate`. See the contribution and
database guides for checks and migration commands.

Do not run destructive local data commands against shared services. `pnpm wipe`
requires `NODE_ENV=development`; check the target database first.
