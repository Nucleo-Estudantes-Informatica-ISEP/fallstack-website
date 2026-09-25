# 0001: Track editions in one repository

Status: Accepted

## Context

Fallstack runs annually. Earlier editions used separate repositories; the 2024 repository was archived when this repository became the persistent `fallstack-website` project.

## Decision

Keep successive editions in this repository. Mark each edition with a `<year>-edition` Git tag and GitHub Release, and write its changes in `CHANGELOG.md`.

## Consequences

- Shared application history and ongoing maintenance remain in one repository.
- A tag's source archive preserves each edition's code. Running that dynamic site still requires its external services and configuration.
- Edition version numbers can restart at `1.0.0`; the year tag distinguishes releases.
