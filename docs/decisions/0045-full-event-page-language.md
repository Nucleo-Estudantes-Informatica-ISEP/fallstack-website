# 0045: Full event homepage language

Status: Accepted (amended 2026-11-17)
Date: 2026-11-16

## Context

The full event homepage has Portuguese editorial copy, headings and schedule
labels. Browser language negotiation sent English browsers to `/event/en`,
where account buttons alone appeared in English.

## Decision

While the full website is enabled, redirect `/event/en` to `/event/pt` before
loading its data. The full homepage's account actions therefore use the same
language as the page. Countdown and offseason pages retain their existing
Portuguese and English versions. A future English full homepage must translate
its complete editorial interface before enabling that route again.

AuthNEI remains the login provider. Readability overlays and safe name fallbacks
for companies without uploaded logos remain in place.

## Amendment — 2026-11-17

Enable both `/event/pt` and `/event/en` for the full website now that its
editorial text, event dates, programme controls, partner and sponsor headings,
pass description, help section and footer labels have English translations.
The language menu must keep the selected route instead of redirecting English
back to Portuguese. Pass the resolved route language to the rendered sections
and continue loading database content through the existing language-specific
DTOs and caches. Legacy database entries without English text retain the
existing Portuguese fallback.

Countdown and offseason routing remain unchanged. Login and account forms keep
their current language; this decision covers the public event homepage.
