# 0008: Enforce Content Security Policy in production

Status: Accepted
Date: 2026-10-11
Source: [Enforce CSP PR](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/346)
Supersedes: [0007](0007-run-csp-in-report-only-mode.md)

## Context

[ADR 0007](0007-run-csp-in-report-only-mode.md) introduced the CSP in
`Content-Security-Policy-Report-Only` mode to surface violations without
blocking users. After validating the violation evidence from the report-only
phase (#343), no critical functional flows were broken by the policy. The
project is ready to promote the policy to full enforcement.

## Decision

Emit the policy through `next.config.js` as `Content-Security-Policy` (not
`Content-Security-Policy-Report-Only`). The policy is built by `src/security/csp.js`
and is identical to the validated report-only policy, with no new exceptions added.

`X-Frame-Options` is set to `DENY` to be consistent with `frame-ancestors 'none'`
in the CSP, so both legacy and modern browsers refuse framing.

## Accepted exceptions and rationale

| Exception                 | Directive               | Reason                                                                                                                                                         |
| ------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'unsafe-inline'`         | `style-src` only        | Required for Next.js CSS-in-JS runtime and Framer Motion inline styles. No nonce mechanism is implemented; scope is strictly limited to styles, never scripts. |
| `data:`                   | `img-src`               | Needed for inline data-URI images (e.g., QR code rendering). Does not permit script execution.                                                                 |
| `blob:`                   | `img-src`               | Needed for in-browser generated blob image previews. Does not permit script execution.                                                                         |
| `https://rsms.me`         | `style-src`, `font-src` | Inter font stylesheet and font files. Restricted to typography only; no script execution allowed from this host.                                               |
| `https://www.youtube.com` | `frame-src`             | Embedded YouTube videos in company profiles. No other directive is widened for this host.                                                                      |
| Sentry DSN origin         | `connect-src`           | Browser crash and telemetry reporting. Resolved at build time from `NEXT_PUBLIC_SENTRY_DSN`; omitted if the variable is unset.                                 |

## Out of scope

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

## Consequences

- The browser blocks any resource load not covered by the policy. A misconfigured
  new integration will be visible immediately rather than silently permitted.
- `'unsafe-inline'` in `style-src` is accepted as a documented exception.
  Future work may replace it with a nonce or hash if Next.js supports it stably.
- The report-only header is removed; violation evidence requires Sentry or
  browser dev-tools inspection.
- Adding any new external origin requires an explicit directive update,
  a documented reason in `SECURITY.md`, and E2E validation in staging.
