# 0053: Save unfinished student signup drafts

Status: Accepted
Date: 2026-11-21
Source: [Issue #659](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/659)

## Context

Reloading student signup discarded the current step and unfinished profile
answers.

## Decision

Save the current step and supported text and selection fields in this browser
under the stable local FallStack account ID. Validate saved data and retain only
interest IDs that are currently offered. Delete the completed draft after
profile creation. Successful sign-out removes all student signup drafts from
this browser to avoid leaving personal details behind on shared devices.

## Consequences

A returning student can resume on the same browser while still signed in.
Draft text is readable by scripts on the same origin and by anyone with access
to the browser storage before sign-out.
Passwords and file selections stay out of the stored draft. The student selects
their CV and profile photo again after reloading.
