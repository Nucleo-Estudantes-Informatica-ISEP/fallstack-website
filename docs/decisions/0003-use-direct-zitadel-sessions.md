# 0003: Use direct ZITADEL sessions

Status: Accepted
Date: 2026-08-18
Source: [Direct OIDC service](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/606ceb2e1dc23069b43de3bb7b340881919ff8ee), [identity migration](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/572250d934f897b1d2b700560b0c352140d571df)

## Context

The application previously depended on Supabase Auth for login while using ZITADEL/AuthNEI for institutional identity. The two session paths complicated account ownership and role checks.

## Decision

Use direct ZITADEL/AuthNEI OIDC login and a signed application session cookie. Keep the application `User` ID independent of the external subject, linked by `zitadelUserId` (migration `20260818150000_direct_zitadel_auth`). Resolve each session against the local user and its active state; ZITADEL grants gate roles, with local admin tiers narrowing access.

As of the [November 2026 audit](../verification/650/README.md), a resolved
session carries employee membership and the employee role only when the local
user has the employee role, the signed session includes the AuthNEI employee
grant, and the associated company is active. A missing grant or membership
removes employee access. An inactive company blocks a non-admin employee
session. The independent AuthNEI admin grant can still authorize backoffice
access without projecting employee membership.

Student onboarding starts after the server resolves a student session without a local profile. Its four steps collect the academic year, biography, interests and optional profile information. Profile creation takes the display name from the verified session (`authName`). When AuthNEI provides no display name, the first step asks the student for one, and the API rejects the request with a 400 if neither name exists. The name is public and read-only after creation, so the server never derives it from the account email.

## Consequences

- Supabase Auth credentials and sessions are no longer part of the active login path.
- Login depends on the configured OIDC provider; local profile data and authorization still depend on the application database.
- Short-lived QR and preview JWTs remain separate from login sessions.
