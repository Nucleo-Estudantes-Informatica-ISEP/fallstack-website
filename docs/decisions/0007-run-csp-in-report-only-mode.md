# 0007: Run CSP in report-only mode

Status: Accepted
Date: 2026-08-31
Source: [Report-only CSP PR](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/352)

## Context

An enforced Content Security Policy can break Next.js scripts, the PWA service worker, or approved third-party resources before the allowlist is tuned.

## Decision

Build an explicit policy in `src/security/csp.js` and emit it through `next.config.js` as `Content-Security-Policy-Report-Only` in every environment. Add sources by directive only when needed; do not use a wildcard as a shortcut.

## Consequences

- Browsers surface violations without blocking the live site; this policy does not yet enforce resource restrictions.
- The team must review violations and test allowed resources before deciding to enforce the policy.
- The application has no dedicated CSP report endpoint; see [`SECURITY.md`](../SECURITY.md) for the current policy.
