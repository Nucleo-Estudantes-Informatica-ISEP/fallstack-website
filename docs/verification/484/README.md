# Shared background verification (#484)

Local checks on 11 November 2026; design references are not QA evidence.

- Focused asset, CSP and company-content tests: 39 passed.
- Full `pnpm test`: 859 passed, 51 failed, 12 skipped. Nine failing files/suites
  require PostgreSQL at localhost:5432, which was unavailable. No shared DB
  was used, and no migrations or destructive data commands were run.
- `pnpm lint`: passed with five pre-existing formatting warnings. Final touched
  component check passed with one canonical Tailwind class warning.
- `pnpm typecheck` and `pnpm exec prisma validate`: passed.
- Production build: passed after the final auth app-mark correction. The
  post-merge build is recorded in the PR.
- `git diff --check` and changed-source formatting checks: passed.

## Browser checks

Ran `pnpm dev` on task-owned port 3108 with example local configuration.
Auth and privacy returned 200, shared WebP and bundled fonts returned 200.
Auth without a session correctly returned 401 from the session API.

Inspected desktop auth at 1280 × 800, then auth and privacy at 360 × 800.
The desktop inspection caught an old 2025 date in `logo_white.svg`; the new
auth artwork now uses the current favicon mark instead. Final mobile captures:

![Auth at 360 CSS pixels](auth-360.png)

![Privacy at 360 CSS pixels](privacy-360.png)

Both final mobile pages had no horizontal overflow. Privacy computed styles:
Coolvetica headings, Inter body, opaque rgb(20,20,20) body. No rsms.me requests
on auth. Auth's initial desktop buffered layout-shift sum was 0.000207 before
the logo correction; this is not proof of zero CLS or a production benchmark.
CSS backgrounds reserve no geometry, and the auth banner reserves 24:5 space.

Preview privacy navigation timed out at 60 seconds during development
compilation; a subsequent snapshot showed the loaded 200 page and successful
artwork/fonts. Existing favicon/TopBar image sizing warnings were visible.

## Remaining verification

Authenticated student/company dashboards, public company data, privacy modal,
real devices and production render-cost comparison need a configured data/auth
environment. No full performance or all-panel accessibility claim is made.
The temporary countdown composite stays intact, as documented in ADR 0030.
The shared asset is smaller than both the combined old backgrounds and the
old hero; no extra runtime JavaScript or blur filter was introduced.
