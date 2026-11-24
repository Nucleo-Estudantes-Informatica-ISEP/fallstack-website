# 0058. Store sign-in destinations across attempts

Status: Accepted

## Context

An interrupted or superseded AuthNEI sign-in must return users to their original local destination. Browser cookies have size and aggregate header limits, so storing the destination directly can discard longer URLs or prevent requests from reaching the application.

## Decision

Store non-root destinations in PostgreSQL against a separate random token for up to 30 minutes. The browser receives that token in a state-specific HTTP-only cookie; a callback must present the token to consume the destination. Knowing the OIDC state alone does not grant access to it. The callback sanitizes the retrieved path before use. Consumption is atomic and expired records cannot be consumed; each subsequent destination write removes expired records. Stored markers from earlier deployments remain readable. An older recovery cookie containing a raw destination is ignored. Root destinations require no database record.

## Consequences

Sign-in with a destination requires database access. If storing it fails, the login page keeps the destination for a new attempt. If reading it during a callback fails, the callback keeps its cookies and offers a retry before redeeming the authorization code. Abandoned destinations remain in the database until a later destination write performs cleanup, so their retention is not a strict 30-minute deletion guarantee. Migration must run before the updated application starts. The sanitized destination is limited to 8,192 characters. Longer destinations fall back to the app root. Deployment request and redirect URL limits also apply.
