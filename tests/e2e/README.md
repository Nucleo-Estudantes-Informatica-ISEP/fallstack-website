# Event test harness

Browser smoke and staging event-flow tests. Existing unit tests stay colocated
with the code they cover (`*.test.ts`/`*.test.tsx`, auto-discovered by Vitest).

## Playwright

Install Chromium and WebKit once per machine. The default test run includes both
engines:

```bash
pnpm exec playwright install chromium webkit
```

Run the health smoke test against a local server:

```bash
pnpm test:e2e
```

Authenticated event tests use Playwright storage-state files captured from
synthetic staging-only Student, Employee, Admin, and Super Admin accounts. They
refuse to run unless `CONFIRM_NON_PRODUCTION=yes` is set. Never use production
accounts or a production URL. Storage-state files hold live staging sessions:
they are gitignored, but handle them like credentials and never share or commit
them.

Capture it by opening the staging login in Playwright, completing login, then
closing the browser:

```bash
pnpm exec playwright codegen \
  --save-storage=tests/e2e/.staging-student.json \
  https://staging.example.org/login
```

Repeat this command for `.staging-employee.json`, `.staging-admin.json`, and
`.staging-super-admin.json`, signing in as the matching synthetic account each
time. The Employee account must belong to a synthetic company. Before capturing
the Admin session, have a Super Admin create that synthetic account with the
`ADMIN` tier in the staging backoffice, then apply its NEI Global admin grant.
A freshly granted account without a preconfigured local tier defaults to
`SUPER_ADMIN`, so it cannot stand in for this account. The suite checks every
supplied session through `/api/auth/session` before mutating data.

Repeat capture whenever a session expires. Delete all four files immediately
after testing (`rm tests/e2e/.staging-*.json`; PowerShell:
`Remove-Item tests/e2e/.staging-*.json`).

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
pnpm test:e2e
```

Run the cross-role critical flow with all four synthetic accounts:

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
E2E_EMPLOYEE_STORAGE_STATE=tests/e2e/.staging-employee.json \
E2E_ADMIN_STORAGE_STATE=tests/e2e/.staging-admin.json \
E2E_SUPER_ADMIN_STORAGE_STATE=tests/e2e/.staging-super-admin.json \
pnpm test:e2e --project=chromium tests/e2e/playwright/event-role-flows.spec.ts
```

This flow uses real staging HTTP and database state. It issues a Student QR,
saves it through the Employee session, reads the saved row back through both
roles, and proves an exact retry returns `409` without overwriting or duplicating
the row. Reruns reuse that one synthetic Student/Employee-company relation and
replace only its `e2e-*` comment. Admin coverage creates one uniquely named
`e2e-*` FAQ and deletes it in `finally`. Do not point these accounts at real
event participants or companies. If a run is killed before cleanup, remove any
leftover `e2e-*` FAQ through the staging backoffice before the next run.

Set `E2E_ALLOW_UPLOADS=yes` to verify authenticated CV upload through the app.
Add `E2E_VERIFY_UPLOAD_LIMITS=yes` to check wrong MIME and over-10 MiB
rejections. These checks run in Chromium only and create an unlinked staging
object; delete it through the admin storage page after the run. Use staging only.

Playwright writes failure screenshots and traces under `test-results/`, plus an
HTML report under `playwright-report/` when that reporter is selected. Inspect a
trace with `pnpm exec playwright show-trace <trace.zip>` and an HTML report with
`pnpm exec playwright show-report`. These directories are gitignored; delete
them after triage because they can contain staging URLs, page data, and session
context.

## k6 load test

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) separately.
The script refuses to run without an explicit non-production confirmation.

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
K6_SCENARIO=qr ACTION_ID=<staging-action-id> \
pnpm test:load
```

Available scenarios:

- `health` — safe liveness baseline.
- `qr` — public action QR issuance; requires `ACTION_ID`.
- `upload-tickets` — authenticated ticket issuance; requires a
  comma-separated `STUDENT_COOKIES` pool from distinct student accounts. Exact
  duplicate cookie entries are rejected, and the script rejects settings that
  could exceed any account's five tickets/minute limit. These are live staging
  session cookies: avoid shell history, never share them, and run only on
  staging.
