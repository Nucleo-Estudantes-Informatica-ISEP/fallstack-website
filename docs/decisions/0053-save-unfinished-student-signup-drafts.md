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
profile creation. Signing out keeps drafts on this browser so each account can
resume its own signup when it returns.

## Consequences

A returning student can resume on the same browser while still signed in.
Passwords and file selections stay out of the stored draft. The student selects
their CV and profile photo again after reloading.
