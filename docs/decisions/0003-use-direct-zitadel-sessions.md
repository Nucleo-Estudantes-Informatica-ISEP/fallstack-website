# 0003: Use direct ZITADEL sessions

Status: Accepted
Date: 2026-08-18
Source: [Direct OIDC service](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/606ceb2e1dc23069b43de3bb7b340881919ff8ee), [identity migration](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/572250d934f897b1d2b700560b0c352140d571df)

## Context

The application previously depended on Supabase Auth for login while using ZITADEL/AuthNEI for institutional identity. The two session paths complicated account ownership and role checks.

## Decision

Use direct ZITADEL/AuthNEI OIDC login and a signed application session cookie. Keep the application `User` ID independent of the external subject, linked by `zitadelUserId` (migration `20260818150000_direct_zitadel_auth`). Resolve each session against the local user and its active state; ZITADEL grants gate roles, with local admin tiers narrowing access.

## Consequences

- Supabase Auth credentials and sessions are no longer part of the active login path.
- Login depends on the configured OIDC provider; local profile data and authorization still depend on the application database.
- Short-lived QR and preview JWTs remain separate from login sessions.
