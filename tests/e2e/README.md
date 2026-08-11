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

The authenticated QR test needs a Playwright storage-state file captured from a
staging student account. It refuses to run unless `CONFIRM_NON_PRODUCTION=yes`
is set. Never use a production account or a production URL. The storage-state
file holds a live staging session: it is gitignored, but handle it like a
credential and never share or commit it.

Capture it by opening the staging login in Playwright, completing login, then
closing the browser:

```bash
pnpm exec playwright codegen \
  --save-storage=tests/e2e/.staging-student.json \
  https://staging.example.org/login
```

Repeat that command whenever the session expires. Delete the file immediately
after testing (`rm tests/e2e/.staging-student.json`; PowerShell:
`Remove-Item tests/e2e/.staging-student.json`).

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
pnpm test:e2e
```

Set `E2E_ALLOW_UPLOAD_TICKETS=yes`, `E2E_SUPABASE_URL`, and
`E2E_SUPABASE_ANON_KEY` to also verify direct CV upload. That test deliberately
creates an unlinked staging file; the existing storage garbage collector removes
it after its retention window. Ticket tests run only in the `chromium` project,
keeping one student's total below the five-ticket-per-minute route limit.

Add `E2E_VERIFY_BUCKET_RESTRICTIONS=yes` to attempt a wrong-MIME upload and an
over-10 MiB upload. Both must be rejected by the staging `cvs` bucket. Run this
only against staging: a misconfigured bucket can retain the rejected-test files
until the garbage collector removes them.

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
