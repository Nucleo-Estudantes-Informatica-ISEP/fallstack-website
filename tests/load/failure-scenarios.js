import { check, sleep } from "k6";
import execution from "k6/execution";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";

const base = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
const fault = __ENV.FAILURE_SCENARIO;
if (!["copy-removed", "redis-unavailable", "copy-drained"].includes(fault))
  throw new Error(
    "FAILURE_SCENARIO must be copy-removed, redis-unavailable or copy-drained"
  );
const vus = Number(__ENV.VUS || 10);
if (!Number.isInteger(vus) || vus < 1 || vus > 100)
  throw new Error("VUS must be an integer between 1 and 100");

// Operator injects at 30s and restores at 90s. Transition samples remain
// visible but have separate gates to account for readiness cache/proxy eviction.
export function phaseAt(seconds) {
  if (seconds < 30) return "baseline";
  if (seconds < 45) return "injection";
  if (seconds < 90) return "fault";
  if (seconds < 105) return "restoration";
  return "recovery";
}

const thresholds = {};
for (const phase of ["baseline", "fault", "recovery"]) {
  thresholds[`checks{phase:${phase}}`] = ["rate==1"];
  thresholds[`http_reqs{phase:${phase}}`] = ["count>0"];
  thresholds[`http_req_failed{phase:${phase}}`] = ["rate<0.01"];
  thresholds[`http_req_duration{phase:${phase}}`] = ["p(95)<3000"];
}
export const options = {
  maxRedirects: 0,
  scenarios: {
    failure: {
      executor: "constant-vus",
      vus,
      duration: "150s",
      gracefulStop: "10s",
    },
  },
  thresholds,
};

export default function runFailure() {
  for (const path of [
    "/api/health",
    "/api/proxy-ready",
    "/api/ready",
    "/api/schedule",
  ]) {
    const phase = phaseAt(execution.instance.currentTestRunDuration / 1000);
    const expected =
      fault === "redis-unavailable" &&
      phase === "fault" &&
      path === "/api/ready"
        ? 503
        : 200;
    const tags = { phase, fault, name: path };
    const response = http.get(`${base}${path}`, {
      timeout: "5s",
      tags,
      responseCallback: http.expectedStatuses(expected),
    });
    check(
      response,
      { "expected status": (res) => res.status === expected },
      tags
    );
  }
  sleep(1);
}
