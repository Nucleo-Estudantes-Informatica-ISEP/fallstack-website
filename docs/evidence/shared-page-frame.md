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
SDK startup, remote ingestion, Next's instrumentation wrappers and browser
instrumentation. The updated harness emits one fixed, synthetic SDK log per
render and asserts that all 3,200 warmup/sample logs reach the privacy filter
when enabled and none do when disabled. Each render uses the active client,
including after changing modes. Transport is a no-op; no telemetry leaves the
process. This measures local log processing, not remote delivery cost.

The HTTP control uses a production build with the optional Sentry DSN unset.
It GETs `/privacy-policy` sequentially, discards 20 warmups per pass and samples
100 responses. Timing includes local client transport and complete response-body
reading. Assertions require HTTP 200, the main-content landmark and 240 distinct
CSP nonces across both passes, guarding against accidentally timing cached HTML.
This isolates a public frame path without homepage data dependencies; it does not
measure the homepage, authenticated traffic, browser hydration or font downloads.

## Replicate measurements

| SSR mode                                             | First pass p50 | First pass p95 | Repeat p50 | Repeat p95 |
| ---------------------------------------------------- | -------------: | -------------: | ---------: | ---------: |
| Child only                                           |         0.0014 |         0.0042 |     0.0008 |     0.0009 |
| Shared frame                                         |         0.0785 |         0.1109 |     0.0817 |     0.1297 |
| Frame + SDK scope/span, logs enabled                 |         0.0974 |         0.1296 |     0.0952 |     0.1182 |
| Frame + SDK scope/span, logs disabled (null control) |         0.0962 |         0.1225 |     0.0913 |     0.1189 |

| Production HTTP control            | Responses sampled | p50 ms | p95 ms |
| ---------------------------------- | ----------------: | -----: | -----: |
| Rep1                               |               100 |  4.752 |  6.914 |
| Rep2, unchanged code/configuration |               100 |  4.349 |  6.205 |

The original measurements ran logs enabled first in both replicates. The harness now reverses the order in rep2; the historical numbers above retain the original order. The logs-disabled mode is a null control: no logs were emitted, so it does not measure logging cost. There is no shipped runtime optimization. All assertions passed (two tests) in the original run.

A verification rerun on 2026-11-13 at `956a00ee` used the updated harness and a local production build with example configuration. Both tests passed, including 240 distinct HTTP nonces. HTTP rep1 p50/p95 was 4.910/6.312 ms; rep2 was 4.499/6.860 ms. These local controls are not production traffic or an optimization comparison.

## Decision and limits

Keep the shared frame and existing error-tracking settings. The historical null control cannot establish the cost of log reporting.
The updated log-emitting comparison below covers local processing. Shared-frame
component rendering is small in the original microbenchmark; removing accessibility, install, authentication or theme behavior
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

## Issue #492 completion scope

The before configuration and the retained after configuration are identical:
shared frame retained, tracing sample rate zero, structured logs enabled, and
per-request nonces retained. Shipped saving is **0 ms (0%) by construction**;
control-run differences are measurement noise, not savings. The log-emitting
candidate comparison measures local work that the historical null control did
not exercise. A noisy or small synthetic delta does not justify removing
centralized reporting or shared-frame behavior.

This completes the measurement-first decision in #492: record shared-frame and
SDK setting costs, make only justified changes (none), record before/after
configuration and zero shipped saving, and preserve the nonce decision. It does
not claim to reproduce the original homepage profile, quantify remote ingestion,
or establish production capacity. A future production optimization needs its own
representative profile; those broader claims are outside this measured decision.

## Log-emitting verification (2026-11-13)

The updated harness passed both tests, including 3,200 processed logs per
enabled replicate, zero per disabled replicate, and 240 unique HTTP nonces.
One SDK client is initialized once; the candidate toggles its `enableLogs`
option between modes, with opposite order in rep2. Startup is outside timing.

| Mode                                  | Rep1 p50 ms | Rep1 p95 ms | Rep2 p50 ms | Rep2 p95 ms |
| ------------------------------------- | ----------: | ----------: | ----------: | ----------: |
| child-only                            |       0.006 |      0.0243 |      0.0014 |      0.0055 |
| frame-only                            |      0.7624 |      3.2376 |      0.2251 |      0.4138 |
| frame+scope+unsampled-span/logs=true  |      0.5345 |      1.8344 |      0.2342 |      0.5453 |
| frame+scope+unsampled-span/logs=false |      0.4723 |      1.4156 |      0.2261 |      0.3145 |

Production HTTP controls: rep1 p50/p95 12.559/26.482 ms; rep2
28.146/80.570 ms. Concurrent activity in other worktrees and growing swap
made this run resource-contended despite this task running checks sequentially.
The enabled-minus-disabled median delta was 0.0622 ms in rep1 and 0.0081 ms
in rep2, while frame-only medians varied by 0.5373 ms. These are observations,
not an isolated causal cost estimate or production saving. Logging actually ran,
but the variance prevents a reliable optimization claim. Preserve reporting;
repeat on an idle representative host before changing settings for performance.
