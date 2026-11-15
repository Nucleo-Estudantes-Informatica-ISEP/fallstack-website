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

App sessions retain their eight-hour TTL for all users. Only attendance rights
expire five minutes after the signed app-session issuance time, for both NEI
members and admins. Check-in then returns 403 until AuthNEI sign-in refreshes
grants; other pages, forms and admin policies keep the existing session lifetime.
Missing issuance times fail closed for attendance, and legacy eight-hour cookies
use the same five-minute bound. Grant revocation can take up to five minutes to
remove check-in access; other admin access retains its existing eight-hour grant
snapshot. Local account deactivation is checked on each request.

Student deletion intentionally removes that student's attendance as part of
account erasure; it does not leave identifiable attendance behind. Session
deletion remains restricted to prevent accidental loss during schedule editing.
The database retention test covers both policies.

The five-minute attendance window is an explicit product tradeoff: bounded grant
revocation takes priority over uninterrupted scanning in this API-only issue.
The check-in UI must pause scanning on 403, preserve the selected session, and
offer AuthNEI sign-in with a sanitized return destination before resuming. It
must distinguish expired staff authorization from an invalid student token and
never silently retry a recorded scan. Silent grant refresh is deferred until a
separate authentication design; no such refresh is claimed here. Employee
onboarding preserves the verified membership and original attendance deadline;
reissuing an app cookie does not refresh grants.

Check-in POSTs share a Redis-backed limit of 60 attempts per staff user per
minute across all sessions and credential forms. Exhaustion returns 429 with
Retry-After; a limiter outage fails closed with 503. Unknown student credentials
emit a structured warning with scanner and session IDs, never the code or token,
so repeated misses can be investigated. Unknown credentials return the same
generic error as other invalid credentials.

## Attendance export snapshots — 14 November 2026

For #471, capture the session day, start/end times and translated activity in
`SessionCheckIn` when inserting attendance. A database trigger owns these fields
and preserves them on updates, including scanner-reference removal. Exports
filter and render the captured values, so later schedule edits cannot move an
attendance record to another day or change its session title or validity time.
Schedule entries can still be corrected for future check-ins.

Migration `20261114140000_snapshot_attendance_sessions` backfills existing rows
from the currently stored schedule. Earlier schedule values cannot be recovered
from data that was never captured. The original attendance migration must not
have been deployed from an obsolete PR snapshot; verify its checksum before
updating an environment. Production rollout remains separate from local checks.
