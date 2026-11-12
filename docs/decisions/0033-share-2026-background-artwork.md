# 0033: Share 2026 background artwork

Status: Accepted
Date: 2026-11-11
Source: [Issue #484](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/484), implementation direction of 30 October 2026

## Context

The original brief requested a blurred gradient, but the supplied hero, auth,
student dashboard and privacy screenshots show the clean patterned artwork.
The later implementation direction explicitly prioritizes those page references.

## Decision

Use the supplied clean no-logo 1920 × 1080 artwork across the full homepage
sections, auth banner, student/company dashboards, student preview, public
company profile and privacy headers (including the privacy modal). Use one
content-hashed WebP, encoded at quality 72, and `background-size: cover` or
`object-fit: cover` to preserve aspect ratio. Do not add runtime blur filters.
The unused blurred alternative is not shipped. Source:
[clean PNG](https://github.com/user-attachments/assets/6d0bb0eb-5b15-4a3b-a1de-b01c5c9337da).

Keep text-bearing artwork behind a uniform #141414 scrim at 60% opacity.
Even white source pixels then become at most #727272, retaining over 4.5:1
contrast with white text. Decorative auth/privacy artwork needs no scrim.
Content panels use opaque #141414 and existing 1 px #484848 borders.
Retain bundled Coolvetica headings and Inter body text; remove the external
Inter stylesheet and the unbundled InterVariable override. No CSP changes.

## Consequences

The shared asset is 28,710 bytes versus 294,632 bytes across the seven retired
optimized backgrounds; it is also smaller than the old 32,582-byte hero used
by dashboards. CSS backgrounds add no layout dimensions. Auth artwork remains in existing normal-flow containers; student signup retains its dedicated artwork. Removing fixed background attachment avoids
scroll repaint work. Fonts retain swap behavior; this change does not claim to
eliminate pre-existing font-swap shifts or hero entrance animation.

The temporary countdown landing retains its 2026 identity composite, which
contains the logo and event artwork together. Replacing that composition is
outside the full-site section background migration; no duplicate logo is
added there. The full homepage Hero/Content components consume shared artwork.

Old section/auth/privacy backgrounds are removed after repointing runtime
references. Historic ADR 0012 retains its original optimization measurements.
Transfer budgets are regression-tested; rendering cost, authenticated routes
and visual approval still require measured browser evidence, not asset-size
inference alone. Shared component states/palette remain owned by #515.
