# 0052 — Enforce application request and recruiting boundaries

Status: Accepted

## Context

The FallStack security review compared permissions across the web app, its
browser storage and recruiting workflows. The same policy must apply across
web copies and at each entry point for a sensitive operation.

## Decision

- Require the configured `AUTH_REDIRECT_URI` origin for cookie-bearing API
  mutations. JSON handlers require `application/json`. Multipart uploads
  require `multipart/form-data`. The OIDC GET callback continues to use its
  state/nonce/PKCE checks. Signed storage transfers still go directly to the
  configured S3 origin.
- AuthNEI logout clears the local cookie even when provider discovery fails.
  The event service worker keeps same-origin HTML navigations, RSC and API
  responses out of Cache Storage. It precaches static assets and the offline
  document. Activation removes former API and document response caches.
- An administrator issues or refreshes action QRs. Students can still redeem
  a current action QR while the action is live.
- Recruiting separates an attendee's pass from the short-lived company
  credential. A verified employee exchanges an attendance QR or fallback code
  for a company-bound preview and save credential. Preview links contain the
  student code and use a path-scoped HTTP-only cookie for unsaved access.
  Same-company saved previews still work after the cookie expires. Company
  saves validate the same audience. A preview credential is never a URL segment.
- Redis reserves one of five per-employee slots before each lookup across
  web copies. Misses retain their slot for 60 seconds. Hits and lookup
  errors release their own reservation. An unavailable limiter returns
  503 before lookup. A full budget, including in-flight reservations,
  returns 429 until a slot is released or expires.
- Each web copy admits one CV archive per company and two archives total.
  Each archive allows up to 500 saved-student rows and 64 MiB of input,
  including the CSV. Exports return 413 above either size limit and 429
  when capacity is full. The bounded ZIP streams as private data.
- Newly uploaded student avatars carry owner metadata on the private object.
  Student writes accept the canonical media reference and require that owner.
  Stored avatar references keep rendering. Existing unbound uploads need a
  fresh upload before new attachment. Outbound links require HTTPS, and
  platform links require their expected hostname. Invalid stored links are
  omitted from display. Authorized edit forms show the stored text and
  submit only changed links, preserving legacy values on unrelated edits.

## Operations

API clients using a FallStack cookie must send the same Origin a browser
would send. Staging QR load tools use a separate admin presenter session.
Old recruiting preview URLs no longer authorize access. Scan again to issue
a company-scoped credential. An installed event PWA clears the old response
caches when the updated worker activates. A client that stays offline cannot
receive the worker update until it reconnects.

No database migration is required.
