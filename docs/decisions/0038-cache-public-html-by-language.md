# 0038: Cache public HTML by language

Status: Accepted
Date: 2026-11-14
Amends: [ADR 0008](0008-enforce-content-security-policy.md), [ADR 0013](0013-cache-public-homepage-data.md)
Source: [Public HTML cache #588](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/588), [Event capacity #446](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/446)

## Context

The event homepage uses public database-backed content. The root layout forced
every HTML document to render with a per-request CSP nonce. A mixed load of
public visitors and QR scans competed for web CPU even with the homepage data
already cached within each process.

## Decision

- `/` selects PT or EN with the existing `?lang=` override and
  `Accept-Language` fallback. It returns a small, uncacheable 307 to
  `/event/pt` or `/event/en`.
- The two homepage variants use incremental static regeneration (ISR) with a
  60-second revalidation interval. They generate on first request so the
  Docker build needs neither event data nor the runtime showcase setting.
  The application keeps the last successful page if regeneration fails.
  A cold render with unavailable required data fails and may be retried.
- `/about`, `/privacy-policy` and `/terms` are also static and share the
  public document layout. These five paths omit CSP. They keep the baseline
  security headers and get any signed-in header state from the session API in
  the browser. The layout sets `dynamic = "error"` so request-specific server
  reads fail generation, including reads introduced in nested components.
  The event route explicitly permits on-demand language parameters.
- Nonce-bearing documents use a separate dynamic root layout. Navigation
  between the two layout groups uses a document load, which applies the
  destination's CSP. Company profiles stay in the nonce-bearing group.
- Cloudflare should cache HTML only for the five exact, queryless URLs.
  Configuration and verification are described in the
  [public cache runbook](../operations/public-data-cache.md#cloudflare-html-cache).

## Consequences

During a database outage, a cold homepage render can return HTTP 500 when the
company roster cannot load. Previously the countdown rendered without the
roster. This availability cost is accepted so a partial page is not stored as
a successful ISR result. A previously generated page remains available when
regeneration fails; recovery of a cold render requires a later successful read.
Full-showcase generation likewise fails when a required section is unavailable.

Public documents lose the CSP browser-side script allowlist. Keeping separate
root layouts ensures that entering account pages from a public document installs
their nonce policy. Edits can take effect at different times across Next copies
and the CDN. Warm both languages directly on the origin after rollout and purge
the five HTML URLs after deploy or urgent changes. The underlying data cache and
its API behavior are described in ADR 0013.
