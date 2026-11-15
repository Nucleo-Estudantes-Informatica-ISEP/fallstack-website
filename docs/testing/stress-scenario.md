# Event stress scenario

Decisions for the Fallstack 2026 capacity tests (#447, Task01-A).

## Targets

- 1,200 homepage users and 200 heavy users (QR scans, CV uploads, check-in).
- All arrive within 1 minute, about 20 homepage loads per second.
- 4 web copies behind the CDN. The capacity of 4 copies is an estimate until Task01-F measures it.

## Pass limits

- Speed: the slowest 5% of homepage loads under 0.75 s.
- Errors: under 1% for homepage and heavy users. Rate-limit responses (429) do not count.

## Uploads

- CV limit is 10 MB (PDF). Test with a realistic mix of sizes, including some at the limit.

## Above capacity

Users wait for their page. Worst case, all 1,200 arrive in the same second and the last user waits about 30 s. This is an accepted risk.

- CDN, proxy and Coolify timeouts must be at least 30 s.
- Revisit only if the heavy-user test (Task01-C2) fails.

## Heavy-user run (Task01-C2, #450)

`pnpm test:load:heavy` runs `tests/load/heavy-users.js` against staging. By
default 200 heavy users arrive within 1 minute, stay for 3 minutes, then leave
over 30 seconds. Each user owns one synthetic account, and no account is used by
more than one group:

| Group     | Default | Account            | Each visit                                                                                                    |
| --------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Dashboard | 40      | Company employee   | `/dashboard`, `/api/companies/history`, then downloads up to 2 saved students' CVs, every 10 s                |
| QR        | 140     | Student            | QR pass (`/api/qrcode`), optional action QR scan, one CV upload, attach, then download of that CV, every 15 s |
| Check-in  | 20      | NEI member (staff) | One session check-in by student code, every 3 s                                                               |

CV uploads cycle through 180 KiB, 450 KiB, 1.2 MiB, 3 MiB and exactly 10 MiB, so
one upload in five is at the limit. Each file is a valid PDF and the student's
download must return the same number of bytes.

### Before the run

- Staging only. The script refuses production and needs
  `CONFIRM_NON_PRODUCTION=yes` and `E2E_ALLOW_UPLOADS=yes`.
- Create the synthetic accounts and export their cookies as comma-separated
  lists: `DASHBOARD_EMPLOYEE_COOKIES`, `QR_STUDENT_COOKIES` and
  `CHECKIN_STAFF_COOKIES`. Put the QR students' codes in `QR_STUDENT_CODES`, in
  the same order as their cookies. Keep cookies out of shell history, logs and
  reports.
- Have every dashboard company save some students who already have a CV.
  Otherwise the dashboard downloads fail their check.
- Set `CHECKIN_SESSION_ID` to a schedule session that is live for the whole run,
  and set `CHECKIN_STUDENT_CODES` to the students to check in. Optionally set
  `ACTION_ID` to a live action so QR users also scan an action QR.
- Leave at least a minute since the QR students' last CV upload.
- The k6 machine needs about 4 GB of free memory. A local 200-user run against
  a mock server peaked at 2.3 GB, because the 10 MiB files are built in memory.

```bash
CONFIRM_NON_PRODUCTION=yes E2E_ALLOW_UPLOADS=yes \
STAGING_BASE_URL=https://staging.example.org E2E_BASE_URL=https://staging.example.org \
CHECKIN_SESSION_ID=<live-session-id> \
pnpm test:load:heavy --summary-export=heavy-users.json
```

Change the mix with `DASHBOARD_USERS`, `QR_USERS` and `CHECKIN_USERS`, and the
timing with `RAMP_SECONDS`, `HOLD_SECONDS`, `UPLOAD_INTERVAL_SECONDS`,
`DASHBOARD_INTERVAL_SECONDS` and `CHECKIN_INTERVAL_SECONDS`. The script refuses
settings above five CV uploads per minute per student (an interval under 12 s)
or above the staff check-in limit.

### Reading the results

Expected responses are reported separately and do not count as errors:

- `cv_upload_rate_limited_429`: uploads refused by the five-per-minute limit.
  The pacing keeps students under the limit, so a high count means the limiter
  is stricter than configured.
- `checkin_duplicate_409`: students who were already checked in, because the
  code list repeats during the run.
- `cv_download_unavailable_404`: saved students without a CV.

`cv_upload_accepted` and `cv_upload_near_limit_accepted` count successful
uploads. `cv_upload_duration` and `cv_download_duration` show file transfer
times without a pass limit. The run fails if more than 1% of requests error,
more than 1% of checks fail, or the slowest 5% of dashboard, history, QR pass,
CV attach or check-in requests take over 0.75 s.

Afterwards, remove the synthetic uploads and accounts through the supported
storage clean-up and admin procedures.
