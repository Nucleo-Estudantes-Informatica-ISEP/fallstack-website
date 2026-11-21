# 0052: Open AuthNEI registration directly

Status: Accepted
Date: 2026-11-21
Source: [Issue #658](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/658)

## Context

[ADR 0037](0037-use-split-layout-for-login-and-signup.md) described a confirmation
screen at `/signup`. A signed-out visitor who has already chosen Create account
can go directly to AuthNEI registration.

## Decision

The login card starts the dedicated registration flow. The guest homepage CTA
links to `/signup`, which checks the event mode before redirecting the visitor to
`/api/auth/login?register=1`. Guest prefetch is disabled because following the
redirect starts a stateful OIDC authorization request. The login endpoint sends
`prompt=create` to AuthNEI and preserves the return to the student profile form.

## Consequences

Visitors choose Create account once during active registration. The `/signup`
route still handles offseason messaging and resumes onboarding for signed-in
students.
