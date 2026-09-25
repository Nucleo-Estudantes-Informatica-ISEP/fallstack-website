# AGENTS.md

Reference for AI agents (and humans) working in this repo. `README.md` covers local setup; this file covers workflow, stack, layout, conventions, and gotchas that aren't obvious from reading one file.

---

## Contribution workflow

For every requested task:

1. Create a new branch from `dev` named `<type>/<short-kebab-case-description>`, following the [Conventional Branch](https://conventionalbranch.org/) spec. Pick the type that matches the change — don't default everything to `chore/`:
   - `feature/` or `feat/` — new functionality
   - `bugfix/` or `fix/` — bug fixes
   - `hotfix/` — urgent production fixes
   - `release/` — release preparation
   - `docs/` — documentation-only changes (README, `docs/`, AGENTS.md, code comments) — a project-specific addition, not part of the base Conventional Branch spec
   - `chore/` — other non-code tasks (config, deps, tooling)
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `chore:`, `refactor:`, `docs:`, `test:`, `build:`, ...), with these rules:
   - No AI co-author trailer (no `Co-Authored-By` line) on any commit.
   - Subject line under 72 characters.
   - If a task touches multiple unrelated concerns, split the work into separate, logically-scoped commits instead of one bulk commit.
3. Push the task branch to the remote repository.
4. Create a pull request from the task branch into `dev`, never `main`.

### CI/CD and test-first workflow

- Prefer TDD for bug fixes and business rules: add a focused test that fails for the reported behavior, implement the smallest fix, then refactor with the suite green. When a pre-fix test cannot be practical (for example, a hosted Supabase policy), document why and provide a repeatable staging check.
- Every behavior change needs a regression test at the lowest useful level. Use integration or Playwright smoke coverage when unit tests cannot prove the boundary.
- A PR is reviewable only after the local equivalents of the required checks pass. Do not weaken lint, TypeScript, tests, builds, migrations, Docker checks, or secret scanning to obtain green CI.
- PRs target `dev`. A reviewed release promotes `dev` to the production branch; Coolify deploys that production branch. Do not add a second competing deployment workflow.
- Database migrations must be committed and deploy through the migrator service before the application becomes healthy. Never claim a migration or deployment succeeded without observing it.
- Dependency PRs may merge only after the same quality gates. Major upgrades require an explicit migration plan rather than being mixed into routine Dependabot groups.

---

## Stack

| Layer           | Tech                                                           |
| --------------- | -------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router), React 18                              |
| Language        | TypeScript (`strict: true`)                                    |
| Styling         | Tailwind CSS 4, HeroUI 2.8                                     |
| Database        | Shared PostgreSQL 16, Prisma 6 (`prisma/schema.prisma`)        |
| Auth            | ZITADEL / AuthNEI (OIDC) — see [Auth model](#auth-model)       |
| Storage         | Shared MinIO (avatars/logos via public app route; CVs private) |
| Validation      | Zod, schemas in `src/schemas/`                                 |
| Package manager | pnpm (see `packageManager` in `package.json`)                  |
| Deploy          | Docker → Coolify                                               |

## Common commands

```bash
pnpm dev          # Next.js dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # eslint .
pnpm typecheck    # next typegen && tsc --noEmit
pnpm generate     # prisma generate (also runs on postinstall)
pnpm migrate      # prisma migrate dev — diffs schema, writes + applies a new migration
pnpm migrate:deploy   # prisma migrate deploy — applies pending migrations, no prompts
pnpm seed         # prisma db seed
pnpm test         # vitest run
pnpm test:watch   # vitest
pnpm wipe -- --confirm   # wipe the DB — only runs when NODE_ENV=development
```

`pnpm test` auto-discovers `*.test.ts` and `*.test.tsx` files with Vitest, including `tests/e2e/` (still just deploy-config smoke tests today, e.g. `dockerBuildArgs.test.ts` checking every `NEXT_PUBLIC_*` var declared in `env.client.ts` is actually wired through the Dockerfile/docker-compose build args — the same gap that caused both the `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_LOGS_DASHBOARD_URL` incidents). Current coverage includes application boundaries/services, domain value objects, edition action rules, auth flow (including the QR/action-scan token sign-and-verify round trip and the student profile page's ownership check), saved-student comments, logger/Sentry privacy, ISEP email normalization, and component smoke tests. Schema changes go through **Prisma Migrate** (`prisma/migrations/`), not `db push` — a baseline migration (`20260712000000_init`) captures the pre-migration schema; run `pnpm migrate --name <description>` for local changes and commit the generated migration folder. `db push` is no longer the working path; see README's Database Workflow section for the one-time baseline-resolve step needed on any environment whose tables predate the migration history.

## Architecture

- Keep runtime Prisma access in `src/application/repositories/`, orchestration in server-only `src/application/services/`, and pure rules in `src/domain/`. Routes stay thin. See [layer boundaries](docs/architecture.md#layer-boundaries).
- Use `defineHandler` for JSON routes and `httpClient` through `src/client/api/` for browser calls. Keep request schemas in `src/schemas/`. See [HTTP conventions](docs/architecture.md#http-conventions).
- `SavedStudent` is unique per `(studentId, companyId)` despite its employee-attributed primary key. See [data ownership](docs/architecture.md#data-ownership).

## Auth model

Login uses AuthNEI/ZITADEL OIDC and an app session. QR and profile-preview JWTs are separate short-lived tokens. See [authentication and short-lived tokens](docs/architecture.md#authentication-and-short-lived-tokens).

## Conventions

- **Validation:** new request validation goes in `src/schemas/` as a named Zod schema, imported by the route — don't add another inline `z.object(...)` in a route file.
- **Route responses:** always pass an explicit status code to `NextResponse.json(body, { status })`. The default is 200, and some existing routes rely on that default even for validation/auth failures — don't copy that pattern in new code.
- **`app/auth/confirm/route.ts`** redirects legacy Supabase email links to login. Keep while old links may exist.
- **Edition-specific content** still hardcoded (tier company lists, booth-to-action mapping, branding) is centralized under `src/edition/` — `edition/actions.ts` holds `actionNames` and the `getBoothActionName()` lookup that `savedStudentService.saveStudent()` calls instead of an inline `switch`. When editing that content for a new event, change `edition/`, not `config/` or `utils/`. Sponsors, FAQ, and the schedule/timetable are DB-backed instead (`Sponsor`/`FaqEntry`/`ScheduleEvent` models), editable through the admin backoffice — don't add a static `edition/` file for any of them.
- **Env vars:** validated through Zod, not read from `process.env` directly. Server-only secrets/config go through `serverEnv` (`src/config/env.server.ts`, guarded by `server-only`, validated lazily on first property access); `NEXT_PUBLIC_*` vars go through `clientEnv` (`src/config/env.client.ts`, validated eagerly at import time, since Next.js inlines them into the browser bundle at build time). Import whichever matches where your code runs — don't add a new raw `process.env.*` read. `.env.example` is the source of truth for required keys; keep it in sync with both schemas when you add or rename one.
- **Components:** every component gets its own `PascalCaseName/index.tsx` folder. Shared, reusable primitives go in `components/ui/` (e.g. `Icons.tsx`, `Input`, `Modal`, `PrimaryButton`); everything else — reusable feature composites or single-use page sections alike (e.g. `Companies`, `Profile`, `GiveawaySection`, `AdminSavedSection`) — stays at the top level of `components/`, following the same pattern. There is no route-local `_components/` convention in use — keep new components in `components/` rather than colocating them under `app/`.
- **Where new code goes:**

  | Kind of code                                                       | Goes in                                                                            |
  | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
  | Prisma/DB access                                                   | `application/repositories/`                                                        |
  | Orchestration (multi-repo calls, external services)                | `application/services/` (mark `"server-only"`)                                     |
  | Pure business rule, no I/O                                         | `domain/<entity-or-concern>/` (camelCase folder)                                   |
  | Browser fetch wrapper                                              | `client/api/` (mark `"client-only"`, built on `lib/http/client.ts`'s `httpClient`) |
  | Zod validation schema                                              | `schemas/`                                                                         |
  | Static/env config                                                  | `config/`                                                                          |
  | Per-edition content still hardcoded (tier company lists, branding) | `edition/`                                                                         |
  | Generic helper (date, files, canvas)                               | `utils/`                                                                           |
  | Shared UI primitive                                                | `components/ui/`                                                                   |
  | Any other component, reusable or single-use                        | top level of `components/`                                                         |
  | Integration/smoke test                                             | `tests/e2e/` (unit tests stay colocated)                                           |

- **API error responses:** shapes are inconsistent across existing routes (`{ error }`, `{ message }`, raw Zod `e.errors`/`e.issues`/`.error`, English and Portuguese strings all appear). For **new** routes, standardize on `{ error: string }` for failures (the majority pattern) with an explicit status code every time — don't add another one-off shape, and don't rely on the 200 default (a few existing routes do this on validation/auth failure; that's a known bug, not a pattern to copy).

## Editions & releases

Each yearly edition is tracked as a git tag + GitHub Release on this one persistent repo (no more forking a new repo per edition) plus a hand-written `CHANGELOG.md` entry — not generated from Conventional Commits, since this ships once a year for a small team.

- **Tag name:** `<year>-edition` (e.g. `2025-edition`, `2026-edition`).
- **Source archive:** GitHub auto-generates a "Source code (zip/tar.gz)" download for every tag/release — that's the frozen, downloadable artifact for a past edition. This is a dynamic Next.js + Postgres app, not a static site, so the archive is source only: running it still needs your own Postgres, a Supabase project, and the usual local setup in `README.md`. No Docker image is published per edition at this time — the source tag is the deliverable (see `CHANGELOG.md` for what changed each edition).
- **Versioning resets per edition:** a freshly-cut edition's `CHANGELOG.md` entry/release starts at `1.0.0`; further within-edition maintenance (fixes, restructuring, hygiene) increments from there (`1.0.1`, `1.1.0`, ...) until the _next_ edition's cutover restarts the count at `1.0.0`. Editions are distinguished by the `<year>-edition` tag, not by a version number that climbs forever across editions.
- The 2026 edition's own `1.0.0` cutover happens once the current backlog of open architecture/security/correctness issues is merged to `main`.

## Verification (definition of done)

CI (`.github/workflows/ci.yml`) uses a frozen install and runs tests, typecheck, lint, the production Next.js build, Prisma schema validation, the production/migrator Docker builds with non-root assertions, and Gitleaks on every PR to `dev` or `main`. Before considering a task done:

1. Run `pnpm lint` and fix anything it flags in touched files — this also runs in CI, but don't wait for CI to tell you.
2. Run `pnpm test` — keep it green, and extend the relevant test file when behavior changes. For a regression, prefer proving the failure first and then implementing the fix. CI reruns the full auto-discovered suite.
3. Run `pnpm typecheck` — this also runs in CI, but don't rely on CI alone to catch it.
4. Run `pnpm build` and `pnpm exec prisma validate`. For deployment-sensitive changes, also build the affected Docker target.
5. Start `pnpm dev` and actually exercise the changed behavior — hit the changed route/page, not just read the diff. For an API route: call it (browser/curl) and check the actual response body _and_ status code. For UI: load the page and interact with the changed flow.
6. Do not report a task as complete on the basis of "it compiles" or "lint passed" alone — those are necessary, not sufficient. State plainly if something couldn't be verified this way (e.g. requires a real Supabase session, a QR scan, or an external service) rather than implying it was checked.

## Gotchas

- **`pnpm test` uses Vitest auto-discovery** for `*.test.ts` and `*.test.tsx`, and CI runs the suite on every PR. Add colocated tests without maintaining a central file list; still verify changed runtime flows manually where unit tests don't cover them.
- **`prisma/wipe.ts` is destructive** (`pnpm wipe -- --confirm`) and only runs when `NODE_ENV` is exactly `development` — it refuses in any other environment (including staging or a non-`development` test setup, not just `production`) — double-check `DATABASE_URL` and `NODE_ENV` before running it anywhere but local.
- **PWA is enabled** (`@ducanh2912/next-pwa`) — changes to caching behavior or service-worker-adjacent routes should be checked on a real device/PWA install, not just the dev server.
- **CSP is not yet configured** in `next.config.js`'s `headers()` — only the baseline headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`) are set. Don't assume a `Content-Security-Policy` or CSP `frame-ancestors` directive exists.
- **QR action codes have no nonce or one-time-consumption check.** The route checks both JWT expiry and timestamp freshness; another student could use a captured code during that short window. See [authentication and short-lived tokens](docs/architecture.md#authentication-and-short-lived-tokens).
