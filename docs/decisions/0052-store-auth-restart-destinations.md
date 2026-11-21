# 0052. Store sign-in destinations across attempts

Status: Accepted

## Context

An interrupted or superseded AuthNEI sign-in must return users to their original local destination. Browser cookies have size and aggregate header limits, so storing the destination directly can discard longer URLs or prevent requests from reaching the application.

## Decision

Store non-root destinations in PostgreSQL against a separate random token for up to 30 minutes. The browser receives that token in a state-specific HTTP-only cookie; a callback must present the token to consume the destination. Knowing the OIDC state alone does not grant access to it. The callback sanitizes the retrieved path before use. Consumption is atomic and expired records cannot be consumed; each subsequent destination write removes expired records. Older in-flight cookies remain readable during rollout. Root destinations require no database record.

## Consequences

Sign-in with a destination now requires database access. Abandoned destinations remain in the database until a later destination write performs cleanup, so their retention is not a strict 30-minute deletion guarantee. Migration must run before the updated application starts. Destinations are limited by the request and redirect URL limits of the deployment, not by cookie size.
