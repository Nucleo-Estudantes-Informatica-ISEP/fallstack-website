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
   - `chore/` — non-code tasks (docs, config, deps, tooling)
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `chore:`, `refactor:`, `docs:`, `test:`, `build:`, ...), with these rules:
   - No AI co-author trailer (no `Co-Authored-By` line) on any commit.
   - Subject line under 72 characters.
   - If a task touches multiple unrelated concerns, split the work into separate, logically-scoped commits instead of one bulk commit.
3. Push the task branch to the remote repository.
4. Create a pull request from the task branch into `dev`, never `main`.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router), React 18 |
| Language | TypeScript (`strict: true`) |
| Styling | Tailwind CSS 4, HeroUI 2.8 |
| Database | PostgreSQL via Supabase, Prisma 6 (`prisma/schema.prisma`) |
| Auth | Supabase Auth (session) — see [Auth model](#auth-model) |
| Storage | Supabase Storage (avatars: public bucket, CVs: private bucket) |
| Validation | Zod, schemas in `src/schemas/` |
| Package manager | pnpm (see `packageManager` in `package.json`) |
| Deploy | Docker → Coolify |

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
pnpm test         # tsx --test src/application/boundaries.test.ts src/application/serviceLogic.test.ts src/edition/actions.test.ts src/lib/authFlow.test.ts src/lib/logger.test.ts src/lib/savedStudentComments.test.ts src/lib/sentryPrivacy.test.ts src/utils/isepEmail.test.ts
pnpm wipe -- --confirm   # wipe the DB — only runs when NODE_ENV=development
```

`pnpm test` covers the application-boundary/service layer, edition action rules, auth flow, saved-student comments, logger/Sentry privacy, and ISEP email normalization — see [Gotchas](#gotchas). Schema changes go through **Prisma Migrate** (`prisma/migrations/`), not `db push` — a baseline migration (`20260712000000_init`) captures the pre-migration schema; run `pnpm migrate --name <description>` for local changes and commit the generated migration folder. `db push` is no longer the working path; see README's Database Workflow section for the one-time baseline-resolve step needed on any environment whose tables predate the migration history.

## Architecture

### Current layout (`src/`)

```
app/            # Next.js App Router: route groups (auth)/(admin)/(guest)/(profiles) + api/** — routes stay thin, delegating to application/
application/    # domain + service + repository layers: domain/ (pure rules), services/ (orchestration, "server-only"), repositories/ (Prisma access)
client/         # client-safe fetch wrappers (e.g. client/api/session.ts) built on lib/http/client.ts's httpClient, "client-only"
components/     # ~60 folders, flat mix of reusable primitives and one-off page sections
config/         # static config object (cookies, upload limits) + env.server.ts/env.client.ts (Zod-validated env) — edition content now lives in edition/, not here
contexts/       # React contexts
edition/        # single source of truth for per-event content: Sponsors, tier company lists, FAQ, ScheduleDays, branding, actions.ts (action names + booth-to-action mapping)
hooks/          # React hooks
lib/            # remaining server + shared helpers not yet moved into application/ (logger, Sentry privacy, file signatures, saved-student comment formatting) + http/ (client.ts's HttpClient, server.ts's defineHandler)
schemas/        # Zod input validation
services/       # thin remainder: authService.ts (JWT sign/verify, cookie helpers), apiResponse.ts, api.ts (client BASE_URL) — session lookup itself moved to application/services/sessionService.ts
styles/         # currently just Icons.tsx
types/          # shared TypeScript types
utils/          # generic helpers only now (date, files, canvas, isepEmail, Supabase client factories) — edition content was moved out to edition/
```

**Layer boundary:** `application/repositories/` is the only place that should query through the Prisma client (i.e. call `prisma.*` at runtime) — type-only imports from `@prisma/client` (e.g. `import type { Tier } from "@prisma/client"` in components/types/services) are fine elsewhere and aren't a boundary violation. `application/services/` orchestrates repositories and domain rules and is marked `"server-only"`; `application/domain/` holds pure business rules with no I/O (including `authPolicy.ts`'s `passesAuthPolicy`, the predicate `defineHandler`'s auth Strategy is built on). `client/` holds browser fetch wrappers marked `"client-only"`, built on `lib/http/client.ts`'s `httpClient`. `lib/` and `services/` are what's left after that split — check the top of a file (`"server-only"`, `"client-only"`, or a Prisma/Supabase-server import) before assuming a function's execution context; the migration to `application/`/`client/` isn't total yet.

**HTTP layer:** `lib/http/` is the two-sided extraction of the old inline `auth → parse → work → respond → error-map` per route. `lib/http/server.ts` (`"server-only"`) exports `defineHandler({ auth, schema?, authorize?, handler })`: `auth` is a Strategy (`"public" | "session" | "student" | "employee" | "admin"`, default `"session"`) resolved against the current session by `passesAuthPolicy`; `schema` is an optional Zod schema whose parsed body lands in `handler`'s `body` (a thrown `ZodError` is mapped to `{ error: issues }`/400 by `httpErrorResponse`, same as any thrown `HttpError`/unknown error); `authorize` is an optional `(session, params) => boolean` for ownership checks (e.g. `session.student?.code === params.code`) that runs after the auth Strategy passes. `lib/http/client.ts` (`"client-only"`) exports `httpClient`, a `FetchHttpClient` implementing the `HttpClient` interface (`get`/`post`/`patch`/`put`/`delete`, JSON in/out, throws a typed `HttpClientError` — with `.status` — on a non-2xx response) plus a `raw()` escape hatch for blob/redirect responses that don't fit the JSON contract (e.g. CSV/zip exports). New routes and new client fetch call sites should go through these instead of hand-rolled session checks or raw `fetch`. See `src/app/api/saved/route.ts` (multiple auth Strategies + `authorize` + schema in one file) and `src/client/api/session.ts` (a `try`/`catch HttpClientError` around a call whose non-2xx response — no session — is an expected outcome, not a failure) for the current pattern. Not every route fits: a hot liveness-probe path that shouldn't pay for a session lookup (`health`), a query-string-JWT-authenticated route rather than a session-cookie one (`export/[code]/cv`), and multipart/form-data uploads (`storage/avatar`, `storage/cv` — `schema` only parses JSON) stay as plain route exports; each says why in a comment. Don't put Prisma calls or business rules directly in a route file — add or extend a repository/service instead.

### Data model

Prisma models: `User` (1:1 `Student` or `Employee`, both keyed by the same `id` as `User`), `Student`, `Company` (has `tier`: DIAMOND/GOLD/SILVER/BRONZE), `Employee` (belongs to `Company`), `Action` / `ActionCompletion` (points for QR-scanned actions), `Interest` (many-to-many with `User`), `SavedStudent` (company saves a student).

**`SavedStudent` grain mismatch:** the table's primary key is `[studentId, employeeId]` (employee-scoped), but `isStudentSaved()` in `src/application/repositories/savedStudentRepository.ts` (exposed as `isSaved()` via `src/application/services/savedStudentService.ts`) checks `savedBy: { companyId }` — i.e. the app-level dedup rule is company-scoped while the DB constraint is employee-scoped. Two employees at the same company can currently save the same student twice. Don't assume the DB enforces what the app-level check assumes.

```mermaid
erDiagram
  User ||--o| Student : "id"
  User ||--o| Employee : "id"
  User }o--o{ Interest : "interests"
  Company ||--o{ Employee : "employs"
  Employee ||--o{ SavedStudent : "saves"
  Student ||--o{ SavedStudent : "saved by"
  Student ||--o{ ActionCompletion : "completes"
  Action ||--o{ ActionCompletion : "completed via"
```

## Auth model

Two independent mechanisms — don't conflate them:

- **Session auth (login state):** Supabase Auth. `getServerSession()` (`src/application/services/sessionService.ts`) reads the Supabase session via `supabase.auth.getUser()`, then looks up the corresponding Prisma `User` (student or employee profile). Client-side equivalent is `getSession()` in `src/client/api/session.ts`, which hits `src/app/api/auth/session/route.ts`.
- **Short-lived action tokens:** hand-rolled JWTs via `jsonwebtoken`, signed/verified in `src/services/authService.ts` (`signJwt`/`verifyJwt`, using `serverEnv.JWT_SECRET` from `@/config/env.server` — not raw `process.env`). Used for the student's personal QR code (`src/app/api/qrcode/route.ts`, 30-minute expiry) and temporary student-profile preview access (`jwtStudent()` in `src/application/services/studentTokenService.ts` signs a token embedding the student `code`, 15-minute expiry; `src/app/(profiles)/student/[...data]/page.tsx` verifies it via `verifyJwt` when the route's `preview` segment is set — used by the company-facing QR and saved-profile flows to grant time-limited profile access within an existing authenticated session, without requiring the profile to be saved) — both genuinely short-lived. **Action QR codes are the exception:** `getActionQrCode()` (`src/application/services/actionService.ts`) intends a 30-second refresh window (`config.constants.actionQrCodeRefreshRateMs * 2`, a millisecond value) but passes that number straight to `jsonwebtoken`'s numeric `expiresIn`, which is interpreted as **seconds** — so the emitted token actually lives ~8.3 hours (30,000 seconds), not 30 seconds; see the anti-replay gotcha below for the compounding effect. **CV export links** (`src/app/api/export`) use the same mechanism but are a separate exception: `signJwt` is called with no `expiresIn`, so the token is intentionally **non-expiring** for now, pending an open retention-policy decision — don't lump it in with the other two as "expiring." None of these are for login sessions.
- `authService.ts` also exports `hashPassword`/`comparePassword`/`validatePassword` (bcrypt). These are currently **unused dead code** — no route calls them. Don't assume there's a bcrypt-based credential path; all real login goes through Supabase.
- Password resets are self-service only: `src/app/(auth)/password-reset/page.tsx` posts an email to `src/app/api/auth/password-reset/route.ts`, which calls Supabase's `resetPasswordForEmail` (PKCE flow, verifier persisted in cookies) with a redirect to `/password-reset/confirm`. The confirm page (`src/app/(auth)/password-reset/confirm/page.tsx`) then calls `supabase.auth.updateUser({ password })` directly from the browser client using the session Supabase restored from the PKCE callback — there is no server route for the confirm step. The old admin-reset-another-user's-password route (`src/app/api/auth/password-change/route.ts`) has been removed; `changePassword()` still exists in `src/application/services/authApplicationService.ts` but is currently **unused dead code** — no route calls it. Don't add a third path — extend the self-service flow, or wire `changePassword()` up if an admin-reset route is genuinely needed again.

## Conventions

- **Validation:** new request validation goes in `src/schemas/` as a named Zod schema, imported by the route — don't add another inline `z.object(...)` in a route file.
- **Route responses:** always pass an explicit status code to `NextResponse.json(body, { status })`. The default is 200, and some existing routes rely on that default even for validation/auth failures — don't copy that pattern in new code.
- **`app/auth/confirm/route.ts`** lives outside the `(auth)`/`api` conventions on purpose — it's the Supabase email-confirmation callback URL, which Supabase itself constructs, so it can't move without reconfiguring Supabase. Leave it where it is.
- **Edition-specific content** (sponsors, tier company lists, booth-to-action mapping, schedule, FAQ, branding) is centralized under `src/edition/` — `edition/actions.ts` holds `actionNames` and the `getBoothActionName()` lookup that `savedStudentService.saveStudent()` calls instead of an inline `switch`. When editing content for a new event, change `edition/`, not `config/` or `utils/`.
- **Env vars:** validated through Zod, not read from `process.env` directly. Server-only secrets/config go through `serverEnv` (`src/config/env.server.ts`, guarded by `server-only`, validated lazily on first property access); `NEXT_PUBLIC_*` vars go through `clientEnv` (`src/config/env.client.ts`, validated eagerly at import time, since Next.js inlines them into the browser bundle at build time). Import whichever matches where your code runs — don't add a new raw `process.env.*` read. `.env.example` is the source of truth for required keys; keep it in sync with both schemas when you add or rename one.
- **Components:** `src/components/` is flat — every component, reusable or single-use, gets its own top-level `PascalCaseName/index.tsx` folder (e.g. `Input`, `Modal`, but also one-off sections like `GiveawaySection`, `AdminSavedSection`). There is no `components/ui/` split and no route-local `_components/` convention in use today — put new components at the top level of `components/` following that same pattern rather than inventing a nested structure.
- **API error responses:** shapes are inconsistent across existing routes (`{ error }`, `{ message }`, raw Zod `e.errors`/`e.issues`/`.error`, English and Portuguese strings all appear). For **new** routes, standardize on `{ error: string }` for failures (the majority pattern) with an explicit status code every time — don't add another one-off shape, and don't rely on the 200 default (a few existing routes do this on validation/auth failure; that's a known bug, not a pattern to copy).

## Verification (definition of done)

CI (`.github/workflows/ci.yml`) runs `pnpm typecheck` and `pnpm lint` on every PR, and `next build` also fails on type/lint errors. CI doesn't run `pnpm test`, so most functional breakage still will not be caught automatically. Before considering a task done:

1. Run `pnpm lint` and fix anything it flags in touched files — this also runs in CI, but don't wait for CI to tell you.
2. Run `pnpm test` — keep it green, and extend the relevant test file if you touch application boundaries/services, edition action rules, auth flow, saved-student comments, `src/lib/logger.ts`, `src/lib/sentryPrivacy.ts`, or ISEP email normalization. CI does not run this for you.
3. Run `pnpm typecheck` — this also runs in CI, but don't rely on CI alone to catch it.
4. Start `pnpm dev` and actually exercise the changed behavior — hit the changed route/page, not just read the diff. For an API route: call it (browser/curl) and check the actual response body *and* status code. For UI: load the page and interact with the changed flow.
5. Do not report a task as complete on the basis of "it compiles" or "lint passed" alone — those are necessary, not sufficient. State plainly if something couldn't be verified this way (e.g. requires a real Supabase session, a QR scan, or an external service) rather than implying it was checked.

## Gotchas

- **`pnpm test` runs eight files** (`src/application/boundaries.test.ts`, `src/application/serviceLogic.test.ts`, `src/edition/actions.test.ts`, `src/lib/authFlow.test.ts`, `src/lib/logger.test.ts`, `src/lib/savedStudentComments.test.ts`, `src/lib/sentryPrivacy.test.ts`, `src/utils/isepEmail.test.ts`), but CI still doesn't run it. Verify most changes manually (dev server, direct route calls) rather than assuming a gate will catch regressions.
- **`prisma/wipe.ts` is destructive** (`pnpm wipe -- --confirm`) and only runs when `NODE_ENV` is exactly `development` — it refuses in any other environment (including staging or a non-`development` test setup, not just `production`) — double-check `DATABASE_URL` and `NODE_ENV` before running it anywhere but local.
- **PWA is enabled** (`@ducanh2912/next-pwa`) — changes to caching behavior or service-worker-adjacent routes should be checked on a real device/PWA install, not just the dev server.
- **CSP is not yet configured** in `next.config.js`'s `headers()` — only the baseline headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`) are set. Don't assume a `Content-Security-Policy` or CSP `frame-ancestors` directive exists.
- **QR action codes have an anti-replay check commented out** in `src/app/api/actions/[id]/route.ts` — the rotating-timestamp freshness check is disabled, so a captured QR code can currently be replayed. This is compounded by a unit bug in `getActionQrCode()` (see [Auth model](#auth-model)): the token itself is valid for ~8.3 hours instead of the intended 30 seconds. Don't assume replay protection is active, and don't assume the token expires quickly even without it.
