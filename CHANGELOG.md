# Changelog

All notable per-edition changes to this project are documented here, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This project ships once a year — one edition per Fallstack event — so entries are written by hand at each edition's cutover rather than generated from commit history. See `AGENTS.md`'s "Editions & releases" section for the tagging/versioning convention.

## [1.1.0] - 2026-07-28 - 2026 edition maintenance

Within-edition update building on the `1.0.0` baseline (165 commits since that tag), headlined by a full admin backoffice.

### Added

- A full admin backoffice: CRUD management UIs for Students, Employees, Companies, Sponsors, Actions, Interests, and Storage, plus an admin statistics page, all built on new shared `DataTable` (sortable, searchable) and `AdminForm` (sectioned, with image/password sections) components, reachable through a new admin sidebar navigation.
- Drag-and-drop admin boards: a Company tier board, an FAQ reorder board, and a two-lane Schedule board, with start/end times editable directly in the schedule board's rows, validated live against the rest of the day.
- SuperAdmin/Admin role tiers, replacing the flat `User.isAdmin` boolean — Super Admins additionally get a new Admins section to create, edit, and activate/deactivate other admin accounts; a migration backfills existing admins to the Admin tier without auto-promoting anyone to Super Admin.
- An admin overview dashboard (`/overview`): stat tiles, a weekly activity chart, and a merged recent-activity feed, now the landing page after an admin logs in instead of the Students list.
- FAQ and Schedule content moved from the hardcoded `edition/` config into the database (`FaqEntry`, `ScheduleEvent` models), now editable from the admin backoffice instead of requiring a code change per edition.
- AuthNEI (Zitadel) OAuth sign-in for students — a fast-path option on signup and login alongside the existing Supabase email/password flow.
- Support for self-hosted Sentry-compatible error-tracking backends (e.g. GlitchTip), configurable via a custom Sentry URL instead of assuming Sentry SaaS.
- In-memory rate limiting on the upload endpoints (avatar/CV), keyed off the proxy-appended client IP.

### Changed

- Project structure rework: `services/` drained into `application/services/` and `config/`, `application/domain/` merged to a top-level `domain/`, and `styles/`/`presentation/` folded into `components/ui/` and `domain/` — see `AGENTS.md` for the updated layout.
- Admin authorization centralized in the `(admin)` layout instead of being re-checked per page.
- Applied the site's actual brand palette (dark background, orange primary) across the admin backoffice in place of generic Tailwind blue/white, and replaced its emoji icons (🗑, ✏️, 📷, ⭐) with `react-icons`.
- Docker build: BuildKit cache mount for the pnpm store, migrate stage now runs as non-root and no longer runs a full Next.js build, and `NEXT_PUBLIC_LOGS_DASHBOARD_URL` is wired through the build.
- Removed the legacy tokenized-link CV export in favor of the current export flow.

### Fixed

- **Security:** student codes are now generated with a CSPRNG instead of a predictable generator.
- **Security:** enforced ownership checks on the student stats route and used strict equality for the student-profile owner check (both previously allowed cross-account access under certain conditions).
- **Security:** `User.active` is now enforced through the full session/auth chain, and admin storage delete rejects path-traversal object names.
- **Security:** the action-QR token's `expiresIn` was being passed in milliseconds instead of seconds, making a token intended to live 30 seconds actually valid for ~8.3 hours; it now expires in ~30 seconds as intended (the underlying anti-replay check is still just the JWT's own expiry — see `AGENTS.md`'s Gotchas).
- **Security:** replaced `innerHTML` with React state in `ImportCvSection`, redacted the Sentry breadcrumb `message` field, required a session for avatar/CV uploads, and closed an open-redirect via backslash-prefixed URLs in the AuthNEI callback.
- **Security:** AuthNEI sign-in no longer relinks an existing password account onto an unconfirmed external identity.
- **Site-wide:** `--color-primary` — the CSS variable every `bg-primary`/`text-primary` Tailwind utility actually reads — held a translucent white instead of the intended brand orange, the result of two same-day commits during the original brand rollout where the second accidentally reverted the first while detaching a same-named `--primary` variable from it. Every `bg-primary` button across the entire site, not just admin, was rendering near-invisible instead of brand orange.
- Admin login redirect: the post-login redirect read the session from React context immediately after triggering its own asynchronous refresh, seeing the stale pre-login value every time and falling through to the homepage regardless of role.
- Company/sponsor logos with light or transparent artwork are no longer invisible against the admin backoffice's white cards and tables (the logo upload preview, the tier board, and the companies/sponsors list tables) — they now render over a dark chip matching the site's own background instead.
- The admin backoffice inherited the public site's global white text color with no override of its own, so any button or link that didn't set an explicit text color (the list pages' search/pagination controls, the logo upload button, several secondary page links) rendered as invisible white-on-white.
- Resolved Dependabot-flagged dependency vulnerabilities.
- Signup flow: resumes instead of retrying account creation on interruption, no longer aborts when CV upload fails, skips stats calls for profile previews, and redirects non-student sessions off the flow earlier.
- Various FAQ/Schedule correctness fixes: atomic order-assignment and reorder writes, order derived from chronological position instead of append-last, and surfaced real errors instead of swallowing them on save failure.

### Known limitations (carried forward)

- The action-QR anti-replay check is still just the token's own (now-correct) ~30s expiry — no dedicated nonce/replay check exists yet.
- The CV export link token is intentionally non-expiring for now, pending a retention-policy decision.

## [1.0.0] - 2026-07-19 - Fallstack 2026 Edition

Baseline cutover for the 2026 edition, closing out the backlog opened by the July 2026 architecture/security/correctness audit of the 2025 codebase (219 commits since the 2025 tag).

### Security

- Removed the unauthenticated password-change route that let anyone reset any account's password; password resets are now self-service only, through Supabase's PKCE reset flow.
- Stopped returning the password-reset token in the API response body.
- Added authorization to previously open endpoints: student profile reads, the company list, and interest-matching now require an authenticated/authorized session instead of being world-readable, and CV downloads are restricted to the owner, a company that has saved that student, or an admin (was: any logged-in user, by code).
- Required an authenticated session for avatar/CV uploads, verified uploaded file bytes against the declared type instead of trusting the client `Content-Type`, and lowered the avatar/CV upload size caps.
- Added baseline security response headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Escaped CSV export fields against spreadsheet formula/CSV injection.
- Enforced company-scoped uniqueness on `SavedStudent` at the database level, closing a duplicate-save race.
- Moved giveaway winner selection server-side — the full student list (with emails) no longer ships to the browser to pick a winner.
- Restricted sponsor/company logo and website URLs to configured storage hosts and http(s) only.

### Added

- An `application/` service/repository/DTO layer and a shared `lib/http` client/server split (`defineHandler` with Strategy-based auth, `httpClient`), so routes are thin and validation is centralized in `src/schemas`.
- Prisma Migrate adopted for schema changes (replacing `db push`), with a baseline migration and `migrate deploy` wired into the Docker build.
- Zod-validated environment configuration (`env.server.ts` / `env.client.ts`), replacing raw `process.env` reads.
- A Vitest test suite and a CI workflow (typecheck + lint + test) gating every PR; `next build` now fails on type/lint errors instead of ignoring them.
- Structured logging (Pino) and privacy-safe Sentry error monitoring (see `OBSERVABILITY.md`).
- A `Sponsor` table and an extended `Company` table with an admin management UI — sponsor and company rosters are now DB-editable instead of hardcoded per edition.
- An `edition/` config layer centralizing per-event content (sponsors, tiers, schedule, FAQ, booth actions).
- An orphaned storage-file GC job (dry-run gated) reconciling uploads against the database.
- A `GET /api/health` endpoint, fixing the Docker healthcheck that previously had nothing to call.
- `AGENTS.md` / `CLAUDE.md`, this `CHANGELOG.md`, and the editions-as-tags convention.

### Changed

- Enabled TypeScript `strict: true` and removed the build-time type/lint error suppression in `next.config.js`.
- Consolidated all in-app notifications on `react-toastify`, removing `sweetalert` and `swal`.
- Wrapped multi-write route handlers (signup, saved-student, company updates, etc.) in Prisma transactions.
- Accessibility pass: `<html lang="pt">` (was `en`), modal focus trapping, associated form labels, contrast/keyboard-nav fixes.
- Client mutations gained consistent error/loading/toast handling.

### Fixed

- Fixed `prisma/wipe.ts` crashing on a non-existent model, and added a hard guard so it only ever runs with `NODE_ENV=development`.
- Fixed validation/auth failures that were returning HTTP 200 instead of 400/401/403.
- Fixed a crash and an unvalidated write in the student `PATCH` route.
- Fixed the Docker build (base URL build arg, migrate service restart policy) and the Coolify deploy path.

### Known limitations (carried into this baseline)

- The action-QR anti-replay check is still disabled — a captured QR code can be replayed (see `AGENTS.md`'s Gotchas).
- The CV export link token is intentionally non-expiring for now, pending a retention-policy decision.
- No application-level rate limiting yet; auth endpoints rely on Supabase's built-in limits.

## [1.0.0] - 2025-11-25 - Fallstack 2025 Edition

The 2025 edition, held 24-25 November 2025 (the website only became reliably usable on the 25th, after fixing launch-day bugs from the first day). Tagged retroactively as the stable baseline `main` has stayed at since.

### Changed

- Consolidated onto a single persistent repo: the 2024 edition's repo was archived, and this repo was renamed from `fallstack2025` to `fallstack-website`.
- Removed the unused `firebase-admin` dependency.
- Routine dependency bumps (`lodash`, `react-easy-crop`, `axios`, `webpack`) — no functional changes.
