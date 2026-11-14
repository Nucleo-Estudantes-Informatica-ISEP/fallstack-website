# Attendance export verification (#471)

## Scope

PR #581 integrates attendance dependency #571 at
`0aadfa40cae65dd17b6e7e12ba075e89a01c4584`. Its additional migration captures
session details in each attendance record. Exports keep their original day,
title and session validity after schedule edits. Scanner deletion retains the
record; session deletion is restricted; student deletion still removes their
attendance.

## Repeatable checks

Prepare an isolated PostgreSQL database, set `DATABASE_URL` and `DIRECT_URL` to
it, then apply migrations and generate the Prisma client. Never use shared data.

```sh
pnpm exec prisma migrate deploy
pnpm generate
NODE_ENV=test pnpm exec vitest run tests/e2e/attendanceExportSnapshot.test.ts tests/e2e/sessionAttendanceRetention.test.ts --maxWorkers=1
```

The snapshot regression creates attendance, changes the schedule day, both times
and title, deletes the scanner, attempts to override the stored snapshot, and
checks the real export repository. It also checks session deletion rejection
and student deletion cascading. SQL-owned functions/triggers are checked by the
existing schema-drift test and listed in `prisma/schema-extras.json`.

For browser verification, start `pnpm dev` against that database with local-only
AuthNEI/JWT configuration. Create an active local ADMIN and a non-admin user,
plus student profiles with institutional numeric and staff email addresses.
Insert one check-in for each profile on each event day. Mint short-lived local
application session cookies using only the local signing secret; include the
`neiMember` claim for the non-admin session. This checks application-session
access, without depending on a live identity provider.

1. Anonymous and signed NEI-member visits to `/attendance` must return 404 and
   contain no export controls.
2. The admin visit must return 200. Select each day and download Excel and CSV.
3. Parse each actual download with `xlsx`: exactly seven headers, one row per
   check-in, institutional number preserved as text, staff number empty, correct
   date/session/check-in/valid-until values in UTC, and CSV formula prefixes
   escaped.
4. Change the source schedule day, title and times after recording attendance.
   Repeat the downloads: they must retain the original values and day grouping.
5. Remove only the disposable attendance fixtures and reload. Both formats
   must still contain all seven headers with no data rows.

## Migration limit

Existing rows are backfilled from the schedule stored when the snapshot migration
runs. Earlier schedule values that were never recorded cannot be reconstructed.
Keep the SQL trigger in restored schemas. Do not edit already-applied migration
history; verify the original attendance migration checksum before rollout.

Local verification does not deploy this feature. #571 must merge before #581;
independent PR review remains required.

## Executed — 14 November 2026

On macOS, Node 24.21.0 and pnpm 10.23.0, with task-owned PostgreSQL 16 on
loopback port 55471:

- Frozen dependency installation, lint (six existing warnings, no errors),
  typecheck, production build and Prisma validation passed.
- Full suite with `NODE_ENV=test` and one worker: 1,203 passed, 12 skipped,
  including snapshot, retention, authorization/token and SQL-schema checks.
  An initial run inherited `NODE_ENV=development` from `.env.example`; its
  shutdown timing test failed, so that run was stopped and repeated with the
  proper test environment. No application fix or check bypass was used.
- Fresh combined migration replay passed. Separately applied the snapshot SQL
  to an existing disposable attendance row and asserted all backfilled values
  equal its source schedule.
- Ran `pnpm dev` on loopback port 3471 with actual database rows and signed
  local application sessions. Anonymous and NEI-member requests returned 404;
  an ADMIN request returned 200.
- Changed both source schedule entries' day, title and start/end times after
  insertion. All four actual downloads (two days × XLSX/CSV) retained the
  original date/session/UTC validity and exactly two original check-ins each.
  Checked all seven headers, numeric student and empty staff numbers, and CSV
  formula-prefix escaping by parsing the downloaded bytes with `xlsx`.
- After deleting the disposable check-ins, both formats retained the seven
  headers and zero data rows. Inspected the rendered export page screenshot.
- Browser and task-owned development server stopped after verification; no
  shared services, real user accounts or production data were changed.

This evidence covers the combined application/migration content in this PR's
completion commit. No live AuthNEI login or production deployment was tested;
neither is needed to exercise this export's existing application-session gate.
