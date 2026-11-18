# 0047: Daily attendance periods and twelve-hour scanner authorization

Status: Accepted
Date: 2026-11-17
Supersedes: [0039](0039-record-session-attendance.md) for new check-ins and staff session lifetime.

## Decision

Attendance is independent of the activity schedule. Each event day has exactly
one morning period (09:00–13:00) and one afternoon period (14:00–18:00),
Europe/Lisbon. Boundaries are inclusive; lunch, overnight and non-event dates
reject scans. Each student can check in once per day and period, enforced by a
PostgreSQL unique constraint across all three production web instances.

The scanner presents Manhã and Tarde, automatically selects the current or next
period, and preserves the selected period across reauthentication. Signed
attendance QR tokens, permanent codes, manual fallback, duplicate responses and
per-staff Redis limits retain their validation. Neither an activity edit nor its
deletion changes daily attendance. Exports identify the period and its end time.
The day selector uses the actual `/attendance` route.

New app-session JWTs and cookies last twelve hours. Attendance rights expire no
later than twelve hours after the original signed issuance time; employee
onboarding preserves any earlier attendance deadline. Missing issuance times
fail closed. Existing shorter cookies expire normally and require sign-in to
receive the new lifetime. Local deactivation is still checked on every request.
Global-grant revocation may now take up to twelve hours to affect an issued
session; this explicitly accepts that tradeoff for uninterrupted event scanning.
MFA and role requirements remain enforced.

## Migration and operation

`AttendanceCheckIn` owns the new unique `(day, period, studentId)` records.
Historical `SessionCheckIn` rows and their immutable activity snapshots remain
intact. Migration imports the earliest historical check-in per half-day, using
the captured activity day/start (before 14:00 maps to morning). Multiple legacy
activity records remain available as history while the daily export counts one
attendance per half-day. Student erasure cascades and scanner erasure clears
attribution in both histories. Production had zero legacy check-ins at the
pre-migration audit; repeat the audit before rollout.

Ship before attendance opens, or pause scanning during the cutover: old code
writes activity attendance while new code writes daily attendance. Do not run
mixed revisions after scanning resumes. The existing migration prerequisite runs
once; the production replica manager copies the primary's exact image and env to
the two other web backends. Verify all three match before admitting scans.
Rollback after new check-ins requires preserving/exporting `AttendanceCheckIn`
and a forward recovery; old code does not consume the new table. Do not delete
new attendance or rewrite migration history to roll back.

The full event page is enabled by production's runtime
`SHOWCASE_FULL_WEBSITE=true`; this exposes the event site immediately without
changing the attendance windows or event dates.
