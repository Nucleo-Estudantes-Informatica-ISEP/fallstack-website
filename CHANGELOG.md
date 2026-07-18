# Changelog

All notable per-edition changes to this project are documented here, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This project ships once a year — one edition per Fallstack event — so entries are written by hand at each edition's cutover rather than generated from commit history. See `AGENTS.md`'s "Editions & releases" section for the tagging/versioning convention.

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
