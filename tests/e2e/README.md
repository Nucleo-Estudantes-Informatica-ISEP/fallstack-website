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

```bash
CONFIRM_NON_PRODUCTION=yes \
E2E_BASE_URL=https://staging.example.org \
E2E_STUDENT_STORAGE_STATE=tests/e2e/.staging-student.json \
pnpm test:e2e
```

Set `E2E_ALLOW_UPLOAD_TICKETS=yes`, `E2E_SUPABASE_URL`, and
`E2E_SUPABASE_ANON_KEY` to also verify direct CV upload. That test deliberately
creates an unlinked staging file; the existing storage garbage collector removes
it after its retention window.

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
  comma-separated `STUDENT_COOKIES` pool. The script rejects settings that
  could exceed any account's five tickets/minute limit. Run only on staging.
