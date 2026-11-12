# Shared page frame and error-tracking measurement

Issue: [#492](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/492).
Measured 2026-11-12 on `4cb5fb0` plus the measurement harness in this PR.
Environment: macOS arm64, 8 GiB RAM, Node 24.21.0, Next 15.5.29,
React 18.3.1, Sentry Next.js 10.78.0. Jobs ran sequentially.

## Method

Run the opt-in harness:

```sh
pnpm install --frozen-lockfile
pnpm generate
pnpm build
pnpm start --port 3107
# In another terminal, while the production server is ready:
RUN_PAGE_FRAME_BENCHMARK=1 PAGE_FRAME_BASE_URL=http://localhost:3107 \
  pnpm exec vitest run tests/performance/sharedPageFrame.test.tsx
```

Stop the server afterward. `next start` warns about standalone output but served
this local measurement successfully; deployment still uses the standalone server.
The normal suite skips both opt-in measurements. No monitoring endpoint receives
benchmark events: the synthetic SDK uses an in-memory no-op transport.

The SSR measurement renders the actual root and guest layouts around a small
section: install context/popup, skeleton theme, toast container, auth context and
top bar. Only Next headers/navigation are mocked. Effects and hydration do not
run; CSS is not measured. Each mode warms 200 renders, then samples 30 batches
of 100 renders. Numbers below are milliseconds per render; p95 is the p95 of
batch averages, not the tail latency of individual renders. Vitest uses React's
test/development environment, so these are comparative microbenchmarks, not
production SSR timings or a replacement for a Next/RSC CPU profile.

The Sentry candidate keeps tracing at zero, default PII disabled, the Pino
integration and existing privacy filters. It wraps rendering in an isolation
scope and unsampled span, comparing `enableLogs: true` with `false`. It excludes
SDK startup, error/log ingestion, Next's instrumentation wrappers and browser
instrumentation. It measures a healthy render with no emitted application logs.

The HTTP control uses a production build with the optional Sentry DSN unset.
It GETs `/privacy-policy` sequentially, discards 20 warmups per pass and samples
100 responses. Timing includes local client transport and complete response-body
reading. Assertions require HTTP 200, the main-content landmark and 240 distinct
CSP nonces across both passes, guarding against accidentally timing cached HTML.
This isolates a public frame path without homepage data dependencies; it does not
measure the homepage, authenticated traffic, browser hydration or font downloads.

## Before and candidate-after numbers

| SSR mode                                     | First pass p50 | First pass p95 | Repeat p50 | Repeat p95 |
| -------------------------------------------- | -------------: | -------------: | ---------: | ---------: |
| Child only                                   |         0.0014 |         0.0042 |     0.0008 |     0.0009 |
| Shared frame                                 |         0.0785 |         0.1109 |     0.0817 |     0.1297 |
| Before: frame + SDK scope/span, logs enabled |         0.0974 |         0.1296 |     0.0952 |     0.1182 |
| Candidate after: same, logs disabled         |         0.0962 |         0.1225 |     0.0913 |     0.1189 |

| Production HTTP control                       | Responses sampled | p50 ms | p95 ms |
| --------------------------------------------- | ----------------: | -----: | -----: |
| Before/control 1                              |               100 |  4.752 |  6.914 |
| After/control 2, unchanged code/configuration |               100 |  4.349 |  6.205 |

The harness labels consecutive controls `before` and `after`. There is **no
shipped runtime optimization** between them. The only candidate change is the
synthetic logs-disabled setting, tested within each SSR pass. All assertions
passed (two tests). Raw values are printed by the repeatable harness.

## Decision and limits

Keep the shared frame and existing error-tracking settings. The candidate's
median difference is about 1–4 microseconds in this synthetic workload; p95 does
not improve consistently across passes. That is insufficient evidence to remove
centralized log reporting. Shared-frame component rendering is small in this
microbenchmark; removing accessibility, install, authentication or theme behavior
is not justified by these numbers. HTTP controls also demonstrate variation
without a code change; do not report their difference as an optimization saving.
The measured shipped saving is zero: no runtime change is proposed.

Do not translate the issue's single-request percentages into absolute savings
or attribute all rendering cost to these components. A representative production
homepage CPU profile with monitoring enabled remains necessary before proposing
changes to Next/RSC instrumentation or browser work. Repeat on the deployment's
Node version, with representative data, cache state and resource limits, before
making capacity claims. This local experiment does not reproduce the issue's
original profile or establish event capacity.

The [nonce decision](../decisions/0008-enforce-content-security-policy.md), dynamic
rendering, document CSP and CDN behavior remain unchanged. Any future nonce or
HTML-cache redesign requires its own ADR. No architecture decision is introduced
by this measurement-only PR.
