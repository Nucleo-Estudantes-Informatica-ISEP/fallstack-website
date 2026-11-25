# 0056: Separate app and AuthNEI sign-out

Status: Accepted
Date: 2026-11-21
Source: [Issue #664](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/664)

## Decision

App-only sign-out clears the FallStack session and returns to the homepage.
Shared sign-out prepares the AuthNEI end-session redirect before clearing the
FallStack session. AuthNEI returns the browser to the registered post-logout
URL. Other apps may retain their own local sessions.

When AuthNEI logout preparation fails, retain the local session for retry.
If an older local session lacks an ID token, offer app-only sign-out and explain
that the user can sign in again to enable shared sign-out. ZITADEL supports a
client ID without an ID token, but that can open an interactive account picker
instead of targeting the current identity.

## Consequences

Employee signup verifies the signed identity before rotating its session and
preserves the logout hints from that identity. The logout POST enforces the
application origin.
