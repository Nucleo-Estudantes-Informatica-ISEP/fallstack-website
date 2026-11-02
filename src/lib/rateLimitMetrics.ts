import "server-only";

import { Counter, Gauge, Histogram, Registry } from "@prometheus-io/client";

// Shared registry survives independent module entry points in the Next runtime.
const state = globalThis as typeof globalThis & {
  fallstackRateLimitRegistry?: Registry;
};
export const rateLimitRegistry = (state.fallstackRateLimitRegistry ??=
  new Registry());
const degraded =
  (rateLimitRegistry.getSingleMetric("fallstack_rate_limit_degraded") as
    Gauge<string> | undefined) ??
  new Gauge({
    name: "fallstack_rate_limit_degraded",
    help: "Last shared limiter observation: 1 unavailable, 0 recovered; updated by limited requests.",
    registers: [rateLimitRegistry],
  });
const transitions =
  (rateLimitRegistry.getSingleMetric(
    "fallstack_rate_limit_transitions_total"
  ) as Counter<string> | undefined) ??
  new Counter({
    name: "fallstack_rate_limit_transitions_total",
    help: "Shared limiter degraded and recovered transitions.",
    labelNames: ["state"],
    registers: [rateLimitRegistry],
  });

export function observeRateLimitTransition(state: "degraded" | "recovered") {
  degraded.set(state === "degraded" ? 1 : 0);
  transitions.inc({ state });
}
const requests =
  (rateLimitRegistry.getSingleMetric("fallstack_rate_limit_requests_total") as
    Counter<string> | undefined) ??
  new Counter({
    name: "fallstack_rate_limit_requests_total",
    help: "Shared limiter decisions; unavailable requests fail closed.",
    labelNames: ["endpoint", "outcome", "reason"],
    registers: [rateLimitRegistry],
  });
const latency =
  (rateLimitRegistry.getSingleMetric(
    "fallstack_rate_limit_duration_seconds"
  ) as Histogram<string> | undefined) ??
  new Histogram({
    name: "fallstack_rate_limit_duration_seconds",
    help: "Shared limiter elapsed time including connect and failures.",
    labelNames: ["endpoint", "outcome"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5],
    registers: [rateLimitRegistry],
  });

export function observeRateLimit(
  endpoint: string,
  outcome: string,
  seconds: number,
  reason: string
) {
  requests.inc({ endpoint, outcome, reason });
  latency.observe({ endpoint, outcome }, seconds);
}
