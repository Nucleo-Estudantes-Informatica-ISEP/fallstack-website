# 0057: Resume AuthNEI email verification

Status: Accepted
Date: 2026-11-21
Source: [Issue #661](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/661)

## Decision

Use fixed app error codes for interrupted sign-in. If UserInfo matches the
verified ID-token subject and the email is unverified, keep a short-lived
HttpOnly recovery cookie. The verification action consumes the cookie and
passes the matching login hint to AuthNEI. The app session is issued only
after AuthNEI confirms a verified email.

## Deployment

Deploy the AuthNEI email-verification resume flow before enabling this
FallStack action. Verify the end-to-end route with an unverified test account
on the deployed issuer.
