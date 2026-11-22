# 0055: Collect the company code before AuthNEI sign-in

Status: Accepted
Date: 2026-11-21
Source: [Issue #660](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/660)

## Decision

Collect the company code before starting AuthNEI. Hold it in the initiating
tab's session storage for the ten-minute OIDC authorization window. The
AuthNEI URL carries only the application return path. After sign-in, read
and remove the code, prefill it, and wait for the user to confirm. Cancellation
and failed authorization remove it.

## Consequences

Same-origin scripts can read the plaintext code during this window. The code
is removed on use and remains useful only after server-side verification from
an authenticated session. When session storage is unavailable, the user can
sign in and enter the code afterward.
