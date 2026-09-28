# Rate limiter validation (#287)

## Scope

`tests/load/event-readiness.js` has a k6 `upload-tickets-boundary` scenario for
the authenticated `POST /api/storage/cv` route. It sends one priming upload,
the remaining four before the 60-second reset, then five after the reset and
one extra request to check for `429`. Accepted uploads must return `201`.
`boundary_combined_allowed` includes the prime (expected 10); the timed close
burst contains nine accepted uploads. The scenario also reports the close
burst's elapsed time.

`tests/e2e/rateLimiterBoundary.test.ts` is the repeatable local check. It
calls the actual CV route, multipart parser, file signature check, and shared
`createRateLimiter` through six synthetic student identities. It stubs only
session lookup and the S3 write. The test sets the clock to 200 ms before and
10 ms after the reset, so it checks route behavior but does not measure
real-world timing or load.

## Reproduce local check

From this branch, run:

```bash
pnpm install --frozen-lockfile
pnpm exec vitest run tests/e2e/rateLimiterBoundary.test.ts
```

Observed on 2026-09-28 (macOS, Node 24, Vitest 4.1.11):

```text
Test Files  1 passed (1)
     Tests  1 passed (1)
```

For each of six students, the test asserts `201` for the prime, `201` for all
four remaining pre-reset uploads, `201` for all five post-reset uploads, and
`429` for the extra request. That is 24 status assertions across six separate
limiter keys. The `429` response body is also checked. No stand-in HTTP server
or untracked k6 shim is involved.

## Remaining staging validation

No current k6 result against the real deployed route is available. Earlier
`24/24`, `boundary_combined_allowed=10`, and elapsed-time figures came from an
untracked Node shim and stand-in server; they are withdrawn. Earlier local
normal-paced and QR figures used an older route and do not validate this
branch. This local test cannot establish storage latency, concurrent QR
throughput, or boundary timing under deployment load.

With synthetic staging accounts and working S3 storage, run the k6 scenario
from `tests/e2e/README.md` using `CONFIRM_NON_PRODUCTION=yes`,
`K6_SCENARIO=upload-tickets-boundary`, and one distinct `STUDENT_COOKIES` entry
per student. Run `upload-tickets` and `qr` separately and then concurrently
against the same staging instance. Record full commands (without cookies),
k6 output, topology, and timestamps here before using the results for the
#287/#344 go/no-go decision. Keep the current limiter until that evidence
shows a concrete problem or the deployment moves to multiple replicas.
