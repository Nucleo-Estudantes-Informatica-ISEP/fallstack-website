import { check, sleep } from "k6";
import http from "k6/http";

import { Trend } from "k6/metrics";

const baseUrl = (__ENV.E2E_BASE_URL || "").replace(/\/$/, "");
const scenario = __ENV.K6_SCENARIO || "health";
const actionId = __ENV.ACTION_ID;
const vus = Number(__ENV.VUS || 50);
const requestIntervalSeconds = Number(__ENV.REQUEST_INTERVAL_SECONDS || 1);
const studentCookies = (__ENV.STUDENT_COOKIES || "")
  .split(",")
  .map((cookie) => cookie.trim())
  .filter(Boolean);
const rateLimitMax = Number(__ENV.RATE_LIMIT_MAX || 5);
const rateLimitWindowMs = Number(__ENV.RATE_LIMIT_WINDOW_MS || 60000);
const burstSize = rateLimitMax + 2;
const allowStorageUnavailable = __ENV.ALLOW_STORAGE_UNAVAILABLE === "yes";
const supportedScenarios = [
  "health",
  "qr",
  "upload-tickets",
  "upload-tickets-boundary",
];

if (__ENV.CONFIRM_NON_PRODUCTION !== "yes")
  throw new Error(
    "Set CONFIRM_NON_PRODUCTION=yes; never load-test production."
  );
if (!baseUrl) throw new Error("Set E2E_BASE_URL to the staging environment.");
if (!supportedScenarios.includes(scenario))
  throw new Error(
    `Unknown K6_SCENARIO "${scenario}". Use health, qr, upload-tickets, or upload-tickets-boundary.`
  );
if (scenario === "qr" && !actionId)
  throw new Error("Set ACTION_ID for K6_SCENARIO=qr.");
if (
  (scenario === "upload-tickets" || scenario === "upload-tickets-boundary") &&
  studentCookies.length === 0
)
  throw new Error(`Set STUDENT_COOKIES for K6_SCENARIO=${scenario}.`);
if (
  (scenario === "upload-tickets" || scenario === "upload-tickets-boundary") &&
  new Set(studentCookies).size !== studentCookies.length
)
  throw new Error(
    "STUDENT_COOKIES must contain one distinct staging student session per entry."
  );
if (!Number.isFinite(vus) || vus < 1)
  throw new Error("VUS must be a positive number.");
if (!Number.isFinite(requestIntervalSeconds) || requestIntervalSeconds <= 0)
  throw new Error("REQUEST_INTERVAL_SECONDS must be a positive number.");
if (scenario === "upload-tickets") {
  const ticketsPerStudentPerMinute =
    Math.ceil(vus / studentCookies.length) * (60 / requestIntervalSeconds);
  if (ticketsPerStudentPerMinute > 5)
    throw new Error(
      "Upload-ticket load exceeds five tickets/minute per student. Add STUDENT_COOKIES, lower VUS, or raise REQUEST_INTERVAL_SECONDS."
    );
}

const boundaryCombinedAllowed = new Trend("boundary_combined_allowed", false);
const isBoundaryScenario = scenario === "upload-tickets-boundary";

export const options = {
  scenarios: {
    [isBoundaryScenario ? "boundary_probe" : "event_peak"]: isBoundaryScenario
      ? {
          executor: "per-vu-iterations",
          vus: studentCookies.length,
          iterations: 1,
          maxDuration: `${Math.ceil(rateLimitWindowMs / 1000 + 30)}s`,
        }
      : {
          executor: "ramping-vus",
          stages: [
            { duration: "30s", target: vus },
            { duration: "2m", target: vus },
            { duration: "30s", target: 0 },
          ],
        },
  },
  thresholds: isBoundaryScenario
    ? { checks: ["rate==1"] }
    : {
        checks: ["rate==1"],
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<750"],
      },
};

function headers() {
  return { "Content-Type": "application/json" };
}

function isAllowedUploadStatus(status) {
  if (status === 201) return true;
  return allowStorageUnavailable && status === 502;
}

function burstUploadTickets(cookie, label) {
  const statuses = [];
  for (let i = 0; i < burstSize; i++) {
    const response = http.post(
      `${baseUrl}/api/storage/cv`,
      JSON.stringify({ contentType: "application/pdf", size: 44 }),
      { headers: { ...headers(), Cookie: cookie } }
    );
    statuses.push(response.status);
  }

  const allowed = statuses.filter((status) =>
    isAllowedUploadStatus(status)
  ).length;
  const limited = statuses.filter((status) => status === 429).length;

  check(null, {
    [`${label}: exactly ${rateLimitMax} requests pass the limiter`]: () =>
      allowed === rateLimitMax,
    [`${label}: exactly ${burstSize - rateLimitMax} requests get 429`]: () =>
      limited === burstSize - rateLimitMax,
    [`${label}: every response accounted for (no unexpected status)`]: () =>
      allowed + limited === burstSize,
  });

  return allowed;
}

export default function runScenario() {
  if (scenario === "health") {
    const response = http.get(`${baseUrl}/api/health`);
    check(response, {
      "health returns 200": (res) => res.status === 200,
      "health response is fast": (res) => res.timings.duration < 750,
    });
  }

  if (scenario === "qr") {
    const response = http.get(`${baseUrl}/api/actions/${actionId}`);
    check(response, {
      "QR generation returns 200": (res) => res.status === 200,
      "QR token is present": (res) => Boolean(res.json("qrCode")),
    });
  }

  if (scenario === "upload-tickets") {
    const cookie = studentCookies[(__VU - 1) % studentCookies.length];
    const response = http.post(
      `${baseUrl}/api/storage/cv`,
      JSON.stringify({ contentType: "application/pdf", size: 44 }),
      { headers: { ...headers(), Cookie: cookie } }
    );
    check(response, {
      "upload ticket returns 201": (res) => res.status === 201,
      "upload ticket has signed token": (res) => Boolean(res.json("token")),
    });
  }

  if (scenario === "upload-tickets-boundary") {
    const cookie = studentCookies[(__VU - 1) % studentCookies.length];
    const windowStart = Date.now();
    const before = burstUploadTickets(cookie, "pre-boundary burst");

    const elapsedMs = Date.now() - windowStart;
    const waitSeconds = Math.max(
      (rateLimitWindowMs - elapsedMs + 250) / 1000,
      0
    );
    sleep(waitSeconds);

    const after = burstUploadTickets(cookie, "post-boundary burst");
    boundaryCombinedAllowed.add(before + after);
    return;
  }

  sleep(requestIntervalSeconds);
}
