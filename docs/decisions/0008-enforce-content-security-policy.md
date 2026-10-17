# 0008: Enforce Content Security Policy in production

Status: Accepted
Date: 2026-10-11
Source: [Enforce CSP PR](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/436)
Supersedes: [0007](0007-run-csp-in-report-only-mode.md)

## Context

[ADR 0007](0007-run-csp-in-report-only-mode.md) introduced the CSP in
`Content-Security-Policy-Report-Only` mode to surface violations without
blocking users. After validating the violation evidence from the report-only
phase (#343), no critical functional flows were broken by the policy. The
project is ready to promote the policy to full enforcement.

During the storage migration to shared services (commit `ac686aab`), legacy
Supabase storage and auth origins (`sources.supabase`) were decommissioned and
removed from all directives.

Next.js App Router emits inline scripts (`self.__next_f.push(...)` RSC payloads
and bootstrap code). Under strict CSP enforcement, `script-src 'self'` without a
nonce blocks these scripts and breaks client-side hydration.

## Decision

1. Enforce the policy through `src/middleware.ts` as `Content-Security-Policy` (not
   `Content-Security-Policy-Report-Only`), built by `src/security/csp.js`.
2. Generate a cryptographically secure per-request nonce (`crypto.randomUUID()` in
   base64) in middleware, attaching `'nonce-<token>'` and `'strict-dynamic'` to
   `script-src`. Next.js App Router consumes the request nonce and attaches it
   to all internal hydration `<script>` tags. Under no circumstances is
   `'unsafe-inline'` permitted in `script-src`.
3. In development mode (`NODE_ENV === "development"`), conditionally append
   `'unsafe-eval'` to `script-src` to allow Webpack HMR and React Refresh. In
   production and test environments, `'unsafe-eval'` is omitted entirely.
4. Set `X-Frame-Options` to `DENY` in `next.config.js` to be consistent with
   `frame-ancestors 'none'` in the CSP, so both legacy and modern browsers refuse
   framing.
5. In `frame-src`, permit only `https://www.youtube.com`. Redundant `'self'` is
   dropped since `frame-ancestors 'none'` denies framing of the app itself.
   Company video links are validated and normalized to `https://www.youtube.com/embed/<id>`
   on save and render.

## Accepted exceptions and rationale

| Exception                  | Directive               | Reason                                                                                                                                                 |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Per-request nonce          | `script-src`            | Cryptographic nonce attached to Next.js App Router RSC payload and hydration scripts, paired with `'strict-dynamic'`. Blocks untrusted inline scripts. |
| `'unsafe-eval'` (dev only) | `script-src`            | Restricted strictly to `NODE_ENV === "development"` for React Refresh and fast dev source maps; absent in production.                                  |
| `'unsafe-inline'`          | `style-src` only        | Required for Next.js CSS-in-JS runtime and Framer Motion inline styles. Scope is strictly limited to styles, never scripts.                            |
| `data:`                    | `img-src`               | Needed for inline data-URI images (e.g., QR code rendering). Does not permit script execution.                                                         |
| `blob:`                    | `img-src`               | Needed for in-browser generated blob image previews. Does not permit script execution.                                                                 |
| `https://rsms.me`          | `style-src`, `font-src` | Inter font stylesheet and font files. Restricted to typography only; no script execution allowed from this host.                                       |
| `https://www.youtube.com`  | `frame-src`             | Embedded YouTube videos in company profiles. No other directive is widened for this host.                                                              |
| Sentry DSN origin          | `connect-src`           | Browser crash and telemetry reporting. Resolved from `NEXT_PUBLIC_SENTRY_DSN`; omitted if the variable is unset.                                       |

## Out of scope

- Supabase is completely decommissioned; no Supabase origin is permitted or
  present in the policy.
- SVG logo support (#282) is explicitly deferred beyond the 2026 edition. No
  pre-emptive SVG exception is added to the enforced policy.
- A dedicated CSP `report-uri` endpoint is not added. Violations in production
  can be observed through Sentry/GlitchTip error events.

## Next.js image proxy and remote origins

Company logos and student avatars stored in MinIO (S3-compatible) are served
through the Next.js `/_next/image` proxy route, not directly from the storage
origin. This means `*.storage.googleapis.com` and `firebasestorage.googleapis.com`
(listed in `imageRemotePatterns.js` for historical Firebase logos) do not need
to appear in `img-src`; the browser only fetches from `'self'`. New external
image origins must be added to `imageRemotePatterns.js` and verified to work
through the proxy before any `img-src` change is considered.

## Rollback plan

If an unanticipated CSP violation breaks production functionality after
deployment:

1. Immediate mitigation: Revert `src/middleware.ts` to disable the middleware,
   or switch the header back to `Content-Security-Policy-Report-Only` via a hotfix
   PR. This immediately restores pre-enforcement behavior without requiring database
   migrations or service restarts.
2. Root-cause analysis: Inspect Sentry error events and browser devtools console logs
   for blocked URIs and directives, adjust `src/security/csp.js` accordingly, and
   verify locally with `pnpm build && pnpm start`.

## Deployment and migration notes

- **Existing `videoHref` records**: Any existing `Company` records containing
  non-YouTube or malformed video URLs will fail schema validation if an organizer
  or company attempts to save the profile again without updating or clearing the field.
- **Rendering behavior**: Legacy or invalid URLs are safely handled at render time:
  `normalizeYouTubeEmbedUrl` returns `null` and `CompanyInfo` renders no iframe,
  preventing arbitrary or `javascript:` URLs from being embedded.
- **Pre-deployment audit**: Operators can run a quick check against the database:
  ```sql
  SELECT id, name, "videoHref"
  FROM "Company"
  WHERE "videoHref" IS NOT NULL
    AND "videoHref" NOT LIKE '%youtube.com%'
    AND "videoHref" NOT LIKE '%youtu.be%';
  ```
  Any matching records can be cleared (`SET "videoHref" = NULL`) or updated to canonical
  YouTube URLs before saving.

## Consequences

- The browser blocks any resource load not covered by the policy. A misconfigured
  new integration will be visible immediately rather than silently permitted.
- Next.js App Router hydration scripts execute safely with cryptographic nonces.
- `'unsafe-inline'` in `style-src` remains an accepted documented exception.
- The report-only header is removed; violation evidence requires Sentry or
  browser dev-tools inspection.
- Adding any new external origin requires an explicit directive update,
  a documented reason in `SECURITY.md`, and E2E validation in staging.
