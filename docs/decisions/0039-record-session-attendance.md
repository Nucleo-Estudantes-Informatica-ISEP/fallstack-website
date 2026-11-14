# 0039: Record session attendance

Status: Accepted
Date: 2026-11-13
Source: [Issue 469](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/469)

## Context

Action completions cannot represent attendance separately for each session.
Attendance must preserve the time and scanner while preventing duplicate scans.

## Decision

Record one check-in per student and schedule session, without check-out. Accept
scans from the session start through its end, inclusive; reject scans outside
that interval without a grace period. Authorize the global NEI `nei-member`
grant and admins. Retain attendance when a scanner is deleted by clearing the
scanner reference, and restrict deletion of sessions with attendance. Deleting
a student cascades to their check-ins.

## Consequences

Staff need a fresh login to receive the new grant in their application session.
Sessions with attendance require the records to be removed before deletion. The
scanner is no longer attributable after that user is deleted. A future change
to early or break-time scans requires an explicit product decision.

Manual codes (`code`, `permanentCode`, `typedCode`) are an intentional staff
fallback: knowing a code permits recording attendance without a student-held
token. Staff must establish presence operationally; the API cannot prove it.
QR tokens use the `attendance` purpose; profile-preview `student-pass` tokens
are rejected by check-in.

NEI-member app sessions expire after five minutes, requiring AuthNEI sign-in
to refresh grants. Previously issued member cookies are subject to the same
five-minute age limit. Revocation can therefore take up to five minutes to
remove member access. Other app sessions retain their existing eight-hour TTL;
admin grants retain that existing snapshot policy. Local account deactivation
is checked on each request.
