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

## Staff attendance scanner — 15 November 2026

For the scanner page `/attendance/scan`, gate the page on role only:
`canAccessAttendanceScanner` admits admins and the AuthNEI `nei-member` grant,
and everyone else receives 403. The five-minute attendance bound stays on the
check-in and count endpoints, which use the `staff` policy. A member past that
bound can therefore still open the page and reach the sign-in prompt, instead
of being refused before the UI can explain why.

The selected session is kept in `?session=` and carried through the AuthNEI
sign-in return destination, so re-authentication resumes the same session. An
unknown or stale id falls back to the session running now. Responses that
arrive after the staff member switches session are discarded, so a check-in or
count from the previous session is never shown under the new one.

A successful check-in (201) and a duplicate (409) both return the student's
name, so staff can confirm the person in front of them. This applies to typed
codes as well as QR scans: a staff account can resolve a four-character code to
a name for any student while a session is open, bounded by the shared limit of
60 check-in attempts per minute. This is accepted because typed codes are an
in-person fallback for a student whose pass will not scan, and confirming the
name is how staff detect a mistyped code. A name is only returned with a
check-in: a new one attributed to the scanner, which leaves an audit trail, or
an existing one for a student already present in that session. It is never
returned outside the check-in endpoint or an open session.

AuthNEI sign-in sends a `nei-member` account without a student profile to the
scanner rather than to student signup, which such staff accounts cannot
complete. The shared account destination used by the top-bar profile link and
the homepage call to action follows the same order: admin, employee, student
profile, NEI staff, then signup.

The count endpoint polled by the scanner sits outside the check-in rate limit,
so reading the count never consumes scan attempts. It reveals only the number
of check-ins for a session and is still gated by the `staff` policy.
