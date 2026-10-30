import { check, sleep } from "k6";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";
import { hasSessionRole, homepageAssets, visitorCookie } from "./homepage.js";

import { Trend } from "k6/metrics";

const baseUrl = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
const profile = __ENV.K6_PROFILE || "smoke";
const scenario = __ENV.K6_SCENARIO || "health";
const actionId = __ENV.ACTION_ID;
const landingAsset = __ENV.LANDING_ASSET || "/assets/images/landing-2026.png";
const vus = Number(__ENV.VUS || 50);
const requestIntervalSeconds = Number(__ENV.REQUEST_INTERVAL_SECONDS || 1);
const studentCookies = (__ENV.STUDENT_COOKIES || "")
  .split(",")
  .map((cookie) => cookie.trim())
  .filter(Boolean);
const rateLimitMax = Number(__ENV.RATE_LIMIT_MAX || 5);
const rateLimitWindowMs = Number(__ENV.RATE_LIMIT_WINDOW_MS || 60000);
const preResetMarginMs = 500;
const resetPollIntervalMs = 100;
const resetDetectionSlackMs = 5000;
const supportedScenarios = [
  "health",
  "homepage",
  "qr",
  "upload-tickets",
  "upload-tickets-boundary",
];

if (!["smoke", "peak"].includes(profile))
  throw new Error("K6_PROFILE must be smoke or peak.");
if (profile === "smoke" && !["health", "homepage", "qr"].includes(scenario))
  throw new Error(
    "Smoke profile only supports read-only health, homepage and qr checks."
  );
if (!supportedScenarios.includes(scenario))
  throw new Error(
    `Unknown K6_SCENARIO "${scenario}". Use health, homepage, qr, upload-tickets, or upload-tickets-boundary.`
  );
if (
  scenario === "homepage" &&
  profile === "peak" &&
  studentCookies.length === 0
)
  throw new Error("Set STUDENT_COOKIES for K6_SCENARIO=homepage.");
if (scenario === "homepage" && homepageAssets([landingAsset]).length !== 1)
  throw new Error("LANDING_ASSET must be a permitted same-origin asset path.");
if (scenario === "homepage" && profile === "peak" && vus < 2)
  throw new Error(
    "Homepage peak needs at least two VUs for both visitor types."
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
if (!Number.isInteger(vus) || vus < 1)
  throw new Error("VUS must be a positive integer.");
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
const boundaryElapsedMs = new Trend("boundary_elapsed_ms", true);
const isBoundaryScenario = scenario === "upload-tickets-boundary";

export const options = {
  // Never follow a staging redirect to production during any load scenario.
  maxRedirects: 0,
  scenarios: {
    [profile === "smoke"
      ? "event_smoke"
      : isBoundaryScenario
        ? "boundary_probe"
        : "event_peak"]:
      profile === "smoke"
        ? {
            executor: "shared-iterations",
            vus: 1,
            iterations: 5,
            maxDuration: "30s",
          }
        : isBoundaryScenario
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
    : scenario === "homepage"
      ? {
          "checks{kind:core}": ["rate==1"],
          "checks{kind:asset}": ["rate>0.99"],
          "http_req_failed{kind:core}": ["rate<0.01"],
          "http_req_failed{kind:asset}": ["rate<0.01"],
          "http_req_duration{name:homepage}": ["p(95)<750"],
          "http_req_duration{name:homepage_asset}": ["p(95)<750"],
          "http_req_duration{name:public_schedule}": ["p(95)<750"],
          "http_req_duration{name:public_faqs}": ["p(95)<750"],
          "http_req_duration{name:public_sponsors}": ["p(95)<750"],
          "http_req_duration{name:public_companies_roster}": ["p(95)<750"],
          "http_req_duration{name:session_guest}": ["p(95)<750"],
          ...(studentCookies.length > 0
            ? { "http_req_duration{name:session_authenticated}": ["p(95)<750"] }
            : {}),
        }
      : {
          checks: ["rate==1"],
          http_req_failed: ["rate<0.01"],
          http_req_duration: ["p(95)<750"],
        },
};

const samplePdf = http.file(
  "%PDF-1.4\n% event-readiness\n%%EOF\n",
  "event-readiness.pdf",
  "application/pdf"
);

function visitHomepage() {
  // Alternate VUs so each identity remains stable throughout the run. Smoke
  // has one VU, so alternate iterations to exercise both visitor types.
  const visitor = profile === "smoke" ? __ITER + 1 : __VU;
  const cookie = visitorCookie(visitor, studentCookies);
  const headers = cookie ? { Cookie: cookie } : {};
  const page = http.get(`${baseUrl}/`, {
    headers,
    tags: { name: "homepage", kind: "core" },
  });
  const pageOk = check(
    page,
    {
      "homepage returns HTML": (res) =>
        res.status === 200 &&
        (res.headers["Content-Type"] || "").includes("text/html"),
    },
    { kind: "core" }
  );
  if (!pageOk) return;

  const references = [];
  const elements = page.html().find("script[src], link[href], img[src]");
  elements.each((index) => {
    const element = elements.eq(index);
    references.push(element.attr("src") || element.attr("href"));
  });
  // The landing artwork is referenced from CSS, not directly from the HTML.
  references.push(landingAsset);
  const assets = homepageAssets(references);
  check(
    assets,
    {
      "homepage includes Next.js scripts and styles": (items) =>
        items.some(
          (item) => item.startsWith("/_next/") && item.includes(".js")
        ) &&
        items.some(
          (item) => item.startsWith("/_next/") && item.includes(".css")
        ),
    },
    { kind: "core" }
  );
  const responses = http.batch(
    assets.map((asset) => ({
      method: "GET",
      url: `${baseUrl}${asset}`,
      params: { tags: { name: "homepage_asset", kind: "asset" } },
    }))
  );
  for (const response of responses)
    check(
      response,
      {
        "homepage asset returns 200": (res) => res.status === 200,
      },
      { kind: "asset" }
    );

  for (const path of ["schedule", "faqs", "sponsors", "companies/roster"]) {
    const response = http.get(`${baseUrl}/api/${path}`, {
      tags: { name: `public_${path.replace("/", "_")}`, kind: "core" },
    });
    check(
      response,
      {
        "public data returns 200 JSON": (res) =>
          res.status === 200 &&
          (res.headers["Content-Type"] || "").includes("application/json"),
      },
      { kind: "core" }
    );
  }
  const session = http.get(`${baseUrl}/api/auth/session`, {
    headers,
    responseCallback: http.expectedStatuses(cookie ? 200 : 401),
    tags: {
      name: cookie ? "session_authenticated" : "session_guest",
      kind: "core",
    },
  });
  check(
    session,
    {
      "visitor session matches its identity": (res) =>
        cookie ? res.status === 200 && hasSessionRole(res) : res.status === 401,
    },
    { kind: "core" }
  );
}

function uploadCv(cookie) {
  return http.post(
    `${baseUrl}/api/storage/cv`,
    { file: samplePdf },
    { headers: { Cookie: cookie } }
  );
}

function isAllowedUploadStatus(status) {
  return status === 201;
}

function sendAllowance(cookie, count) {
  let allowed = 0;
  for (let i = 0; i < count; i++)
    if (isAllowedUploadStatus(uploadCv(cookie).status)) allowed++;
  return allowed;
}

function probeWindowBoundary(cookie) {
  const primeSentAt = Date.now();
  const primeAllowed = isAllowedUploadStatus(uploadCv(cookie).status);
  const primeRoundTripMs = Date.now() - primeSentAt;
  const preResetLeadMs = preResetMarginMs + rateLimitMax * primeRoundTripMs;

  sleep(
    Math.max(primeSentAt + rateLimitWindowMs - preResetLeadMs - Date.now(), 0) /
      1000
  );
  const burstStartedAt = Date.now();
  const preResetAllowed = sendAllowance(cookie, rateLimitMax - 1);

  const deadline = primeSentAt + rateLimitWindowMs + resetDetectionSlackMs;
  let probe;
  do {
    probe = uploadCv(cookie);
    if (probe.status !== 429) break;
    sleep(resetPollIntervalMs / 1000);
  } while (Date.now() < deadline);

  const resetDetected = isAllowedUploadStatus(probe.status);
  const postResetAllowed = resetDetected
    ? 1 + sendAllowance(cookie, rateLimitMax - 1)
    : 0;
  const burstEndedAt = Date.now();
  const beyondAllowance = resetDetected ? uploadCv(cookie) : undefined;

  check(null, {
    "prime request passes the limiter": () => primeAllowed,
    [`pre-reset: remaining ${rateLimitMax - 1} requests pass the limiter`]:
      () => preResetAllowed === rateLimitMax - 1,
    [`post-reset: next ${rateLimitMax} requests pass the limiter`]: () =>
      postResetAllowed === rateLimitMax,
    "post-reset: a request beyond that allowance gets 429": () =>
      beyondAllowance !== undefined && beyondAllowance.status === 429,
  });

  if (resetDetected) {
    boundaryCombinedAllowed.add(
      Number(primeAllowed) + preResetAllowed + postResetAllowed
    );
    boundaryElapsedMs.add(burstEndedAt - burstStartedAt);
  }
}

export default function runScenario() {
  if (scenario === "homepage") visitHomepage();
  if (scenario === "health") {
    const response = http.get(`${baseUrl}/api/health`);
    check(response, {
      "health returns 200": (res) => res.status === 200,
      "health response is fast": (res) => res.timings.duration < 750,
    });
  }

  if (scenario === "qr") {
    const response = http.get(
      `${baseUrl}/api/actions/${encodeURIComponent(actionId)}`
    );
    check(response, {
      "QR generation returns 200": (res) => res.status === 200,
      "QR token is present": (res) => Boolean(res.json("qrCode")),
    });
  }

  if (scenario === "upload-tickets") {
    const cookie = studentCookies[(__VU - 1) % studentCookies.length];
    const response = uploadCv(cookie);
    check(response, {
      "CV upload returns 201": (res) => res.status === 201,
      "CV upload returns a file id": (res) => Boolean(res.json("id")),
    });
  }

  if (scenario === "upload-tickets-boundary") {
    probeWindowBoundary(studentCookies[(__VU - 1) % studentCookies.length]);
    return;
  }

  sleep(requestIntervalSeconds);
}
