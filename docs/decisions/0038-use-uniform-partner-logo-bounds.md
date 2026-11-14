# 0038: Use uniform partner logo bounds

Status: Accepted
Date: 2026-11-14
Source: [PR #557](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/557), [issue #480](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/480)

## Context

Partner tiers need consistent logo sizes regardless of stored presentation
settings. [ADR 0020](0020-feature-companies-by-rank.md) covers rank selection;
this decision covers tier-card presentation and compatibility.

## Decision

Partner tier cards use uniform bounds and ignore the stored per-company logo
width, height and CSS overrides. Retain those fields and the display-style API
for compatibility and to preserve existing data; callers must not expect them
to affect tier cards. A future removal requires a separately planned migration
and API retirement.

## Consequences

Admins no longer see ineffective sizing controls. Existing stored settings and
API consumers remain compatible, while tier cards keep equal contained bounds.
This supplements ADR 0020 without changing its rank-selection decision.
