# 0036: Use the split layout for login and signup

Status: Accepted
Date: 2026-11-12
Source: [Issue #486](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/486), implementation direction of 30 October 2026

## Context

The login page used a centred card under the site top bar, while signup already
used a split layout with the 2026 artwork. The mock-up for login shows email and
password fields and a "Recuperar password" link, and a five-step signup. The
application has no password login: production sign-in goes through
`/api/auth/login` and AuthNEI.

## Decision

Login and signup share one split layout: artwork panel on the left, form panel
on the right. Below 1024 px the panel collapses into a banner above the form,
and it is hidden in short landscape viewports. The site top bar and the NEI icon
are not shown on these pages, and no logo is overlaid on the artwork.

The login mock's email and password fields are not implemented. The page keeps a
single "Continuar com AuthNEI" action that goes through `/api/auth/login`.

"Recuperar password" is not a link or a local reset flow. The page shows
guidance that recovery happens in AuthNEI itself. The existing password-reset
routes keep redirecting to `/login`.

The mock's signup steps map to the existing flow:

- Credentials (year, email, password, confirmation): provided by AuthNEI after
  sign-in; the email is read-only and no password is collected.
- Biography, interests, CV, avatar, LinkedIn and privacy consent: the onboarding
  wizard from issue #404.
- Employee registration: the company-code subview on `/login?modal=employee`,
  restyled with the same fields and buttons.

Mock colours (#141414, #484848, #82360D) are not tokens; the primary colour and
the bundled Coolvetica and Inter fonts are unchanged.

## Consequences

Login and signup look consistent and share one layout component. Identity and
recovery stay with AuthNEI, so the application stores no passwords. The
"Continuar com AuthNEI" button restyle also applies to the `/signup` gate.
