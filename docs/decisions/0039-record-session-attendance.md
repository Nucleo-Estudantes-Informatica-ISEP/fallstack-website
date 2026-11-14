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
