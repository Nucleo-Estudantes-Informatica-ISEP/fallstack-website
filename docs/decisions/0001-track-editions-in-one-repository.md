# 0001: Track editions in one repository

Status: Accepted
Date: 2026-07-14
Source: [Edition convention](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/bf82ce7d1908ede3c4211831b5d82571ac7770f7)

## Context

Fallstack runs annually. Earlier editions used separate repositories. The 2024 repository was archived, and this repository was renamed from `fallstack2025` to `fallstack-website`. The release convention was first documented in July 2026; later releases added automated SemVer tags.

## Decision

Keep successive editions in this repository. Mark each edition cutover with a `<year>-edition` Git tag and GitHub Release. Use `vX.Y.Z` tags and GitHub Releases for subsequent versions within an edition. Keep `CHANGELOG.md` as the hand-written summary of edition cutovers and notable milestones; the GitHub Releases record interim version changes.

## Consequences

- Shared application history and ongoing maintenance remain in one repository.
- A tag's source archive preserves each edition's code. Running that dynamic site still requires its external services and configuration.
- Year tags identify edition cutovers; SemVer tags identify subsequent releases. The 2026 edition has continued through `v2.2.0` without another edition tag.
