# 0034: Limit PWA install guidance to supported platforms

Status: Accepted

Date: 2026-11-12

## Context

The browser `beforeinstallprompt` event is not available consistently across
browsers. Showing a generic installation message to every visitor can promise
an install action that their browser does not support. iOS browsers do not
dispatch that event, but users can install a web app through the iOS Share
menu. User-agent detection is heuristic and should be isolated from the
browser event listener.

## Decision

Show the install prompt when the browser dispatches `beforeinstallprompt`.
When that event is unavailable, show manual installation instructions only
for iPhone and iPad browsers, including iPadOS desktop-mode user agents. Do
not show generic instructions on Android or desktop browsers. Do not show
installation guidance or attach install listeners when already running in
standalone mode.

## Consequences

- The iOS guidance is covered by a pure, table-driven domain test; browser
  event and standalone wiring are covered separately.
- Browser identification remains heuristic and must be adjusted if platform
  behavior changes.
- The Safari tab guidance and the installed app's standalone behavior were
  confirmed manually on a real iPhone for this change. Repeat that check when
  the install flow changes; an emulator does not replace that evidence.
