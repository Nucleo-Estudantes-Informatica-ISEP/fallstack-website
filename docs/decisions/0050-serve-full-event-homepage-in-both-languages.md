# 0050: Serve the full event homepage in both languages

Status: Accepted
Date: 2026-11-17
Supersedes: [ADR 0049](0049-full-event-page-language.md)

## Context

The temporary Portuguese-only homepage redirected `/event/en` to `/event/pt`
because its editorial interface had no complete English version. This made the
language menu appear to reload the page without changing the selected language.
The full public homepage now has English editorial text and accessible labels.

## Decision

Enable both `/event/pt` and `/event/en` for the full website. Keep the selected
route instead of redirecting English to Portuguese. Pass its resolved language
to the editorial sections and signed-in navigation, including accessible names,
programme dates, partner and sponsor headings, help and footer controls. Mark
the homepage content and navigation with their corresponding language.

Continue loading database content through the existing language-specific DTOs
and caches. Legacy entries without English text retain the established
Portuguese fallback. Countdown and offseason routing remain unchanged. Login
and account forms keep their current language; this decision covers the public
event homepage.

## Consequences

Visitors can switch between Portuguese and English and retain their selection
when reloading the event route. Shared controls default to Portuguese outside
an explicitly English page. New public copy and accessible labels need coverage
in both languages. Database translations remain editable by administrators.
