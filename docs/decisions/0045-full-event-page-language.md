# 0045: Keep the full event homepage in Portuguese

Status: Accepted
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
