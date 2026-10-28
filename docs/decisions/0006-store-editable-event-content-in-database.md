# 0006: Store editable event content in the database

Status: Accepted
Date: 2026-07-23
Source: [Sponsor model](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/01b7d314fa288ceb7f045f84ce64ac2f13881570), [FAQ model](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/45672b24ef0a07653a7f9aeb6e9c25380af60bb2), [schedule model](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/e6a653ea8307eee29db37226e144dae9b7282fb4)

## Context

Sponsors, FAQ entries, and the timetable were hardcoded per edition. Updating them required a code change and deployment.

## Decision

Store those editable records in the `Sponsor`, `FaqEntry`, and `ScheduleEvent` tables. Read public content through repositories and services; let admins edit and order it in the backoffice. Keep remaining code-owned edition data in `src/edition/`.

## Consequences

- Authorized admins can update these records without a site rebuild.
- The initial move required data migrations; later schema changes still need reviewed migrations.
- Database availability now affects these public content sections.
