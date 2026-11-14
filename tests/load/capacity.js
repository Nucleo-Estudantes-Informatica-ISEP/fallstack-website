// Opt-in disposable staging workload; never emit session cookies or QR tokens.
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import execution from "k6/execution";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";
import { homepageAssets } from "./homepage.js";

import { Counter, Rate, Trend } from "k6/metrics";

const base = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
const workload = __ENV.CAPACITY_WORKLOAD || "homepage-target";
const vus = Number(__ENV.VUS || 80);
if (!["homepage-target", "homepage-concurrency", "heavy"].includes(workload))
  throw new Error("Unknown CAPACITY_WORKLOAD");
if (!Number.isInteger(vus) || vus < 1 || vus > 600)
  throw new Error("VUS must be an integer between 1 and 600");
const accounts = new SharedArray("synthetic accounts", () =>
  JSON.parse(open(__ENV.CAPACITY_ACCOUNTS))
);
const needed = workload === "homepage-target" ? 600 : vus;
if (
  accounts.length < needed ||
  accounts.some((a) => !a.studentCookie || !/^[A-Z0-9]{6}$/.test(a.code)) ||
  new Set(accounts.map((a) => a.studentCookie)).size !== accounts.length ||
  new Set(accounts.map((a) => a.code)).size !== accounts.length
)
  throw new Error(
    "Provide distinct synthetic students with six-character codes"
  );
if (
  workload === "heavy" &&
  (__ENV.E2E_ALLOW_UPLOADS !== "yes" ||
    !__ENV.ACTION_ID ||
    accounts.slice(0, vus).some((a) => !a.employeeCookie) ||
    new Set(accounts.slice(0, vus).map((a) => a.employeeCookie)).size !== vus)
)
  throw new Error(
    "Heavy load needs upload opt-in, ACTION_ID and distinct employees"
  );

const errors = new Rate("capacity_errors");
const throttled = new Counter("capacity_429");
const responses = new Counter("capacity_responses");
const homepageLoad = new Trend("homepage_load", true);
const completed = new Counter("completed_visits");
const boothScans = new Counter("booth_scans");
const actionCheckIns = new Counter("action_check_ins");
const largeCvs = new Counter("large_cvs_verified");
export const options = {
  maxRedirects: 0,
  // Exclude URL/error tags: action paths contain tokens, student paths contain codes.
  systemTags: ["status", "method", "name", "scenario", "expected_response"],
  summaryTrendStats: ["avg", "min", "med", "max", "p(95)", "p(99)"],
  scenarios: {
    capacity:
      workload === "homepage-target"
        ? {
            executor: "constant-arrival-rate",
            rate: 20,
            timeUnit: "1s",
            duration: "60s",
            preAllocatedVUs: vus,
            gracefulStop: "30s",
          }
        : {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
              { duration: "60s", target: vus },
              { duration: "120s", target: vus },
            ],
            gracefulRampDown: "30s",
            gracefulStop: "30s",
          },
  },
  thresholds: {
    capacity_errors: ["rate<0.01"],
    checks: ["rate>0.99"],
    ...(workload === "heavy"
      ? {
          booth_scans: [`count==${vus}`],
          action_check_ins: [`count==${vus}`],
          large_cvs_verified: ["count>0"],
        }
      : { "http_req_duration{name:homepage}": ["p(95)<750"] }),
    ...(workload === "homepage-target"
      ? {
          dropped_iterations: ["count==0"],
          completed_visits: ["count>=1200"],
        }
      : {}),
  },
};

// k6 must discover every fixture before it initializes individual VUs.
if (workload === "heavy" && __VU === 0)
  for (const key of ["CV_SMALL", "CV_MEDIUM", "CV_LARGE"])
    open(__ENV[key], "b");

// Only 10% of heavy VUs allocate a near-limit body; don't allocate 10 MiB per VU.
const size = __VU % 10 === 0 ? "large" : __VU % 3 === 0 ? "medium" : "small";
const pdf =
  workload === "heavy"
    ? http.file(
        open(__ENV[`CV_${size.toUpperCase()}`], "b"),
        "cv.pdf",
        "application/pdf"
      )
    : null;

function observe(response, name, expected) {
  const tags = {
    operation: name,
    status: String(response.status),
    copy: response.headers["X-Instance-Id"] || "none",
    cache: response.headers["Cf-Cache-Status"] || "none",
  };
  responses.add(1, tags);
  if (response.status === expected && name === "booth_scan") boothScans.add(1);
  if (response.status === expected && name === "check_in")
    actionCheckIns.add(1);
  if (response.status === 429) throttled.add(1, { operation: name });
  else errors.add(response.status !== expected, { operation: name });
  check(response, { [name]: (r) => r.status === expected || r.status === 429 });
  return response.status === expected;
}

function request(method, path, name, cookie, body, expected = 200) {
  const response = http.request(method, `${base}${path}`, body ?? null, {
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(typeof body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    tags: { name },
    timeout: "30s",
    responseType: name.startsWith("cv_download_") ? "binary" : "text",
    responseCallback: http.expectedStatuses(expected, 429),
  });
  return { response, ok: observe(response, name, expected) };
}

function homepage() {
  const visit =
    workload === "homepage-target"
      ? execution.scenario.iterationInTest
      : __VU - 1;
  const cookie =
    visit % 2
      ? accounts[Math.floor(visit / 2) % accounts.length].studentCookie
      : null;
  const start = Date.now();
  const language = visit % 2 ? "en" : "pt";
  const redirect = request(
    "GET",
    `/?lang=${language}`,
    "homepage_redirect",
    cookie,
    null,
    307
  );
  if (
    !redirect.ok ||
    !check(redirect.response, {
      "homepage redirect stays on the selected language": (r) =>
        r.headers.Location === `/event/${language}` ||
        r.headers.Location === `${base}/event/${language}`,
    })
  )
    return;
  const page = request("GET", `/event/${language}`, "homepage", cookie);
  if (!page.ok) return;
  const refs = ["/assets/optimized/theme-clean.a9aad2a7a171.webp"];
  const elements = page.response
    .html()
    .find("script[src], link[href], img[src]");
  elements.each((i) => {
    const element = elements.eq(i);
    refs.push(element.attr("src") || element.attr("href"));
  });
  const assets = homepageAssets(refs);
  const batch = http.batch(
    assets.map((path) => ({
      method: "GET",
      url: `${base}${path}`,
      params: { tags: { name: "homepage_asset" }, timeout: "30s" },
    }))
  );
  for (const response of batch) observe(response, "homepage_asset", 200);
  for (const path of ["schedule", "faqs", "sponsors", "companies/roster"])
    request("GET", `/api/${path}`, "public_data");
  request(
    "GET",
    "/api/auth/session",
    "session",
    cookie,
    null,
    cookie ? 200 : 401
  );
  homepageLoad.add(Date.now() - start);
  completed.add(1);
}

function heavy() {
  const a = accounts[__VU - 1];
  request("GET", "/dashboard", "dashboard", a.employeeCookie);
  request("GET", `/student/${a.code}`, "student_profile", a.studentCookie);
  const qr = request("GET", "/api/qrcode", "student_qr", a.studentCookie);
  if (__ITER === 0 && qr.ok) {
    request(
      "POST",
      "/api/saved",
      "booth_scan",
      a.employeeCookie,
      JSON.stringify({
        token: qr.response.json("data"),
        comment: "capacity453",
      }),
      201
    );
    const action = request(
      "GET",
      `/api/actions/${__ENV.ACTION_ID}`,
      "action_qr"
    );
    if (action.ok)
      request(
        "POST",
        `/api/actions/${action.response.json("qrCode").replace(/^action-/, "")}`,
        "check_in",
        a.studentCookie
      );
  }
  const upload = request(
    "POST",
    "/api/storage/cv",
    `cv_upload_${size}`,
    a.studentCookie,
    { file: pdf },
    201
  );
  if (upload.ok) {
    const attach = request(
      "POST",
      `/api/students/${a.code}/cv`,
      "cv_attach",
      a.studentCookie,
      JSON.stringify({ id: upload.response.json("id") })
    );
    if (attach.ok) {
      const download = request(
        "GET",
        `/api/students/${a.code}/cv/file`,
        `cv_download_${size}`,
        a.employeeCookie
      );
      const valid = check(download.response, {
        "CV bytes match uploaded size": (r) =>
          r.status === 429 ||
          (r.status === 200 && r.body.byteLength === pdf.data.byteLength),
      });
      if (valid && download.ok && size === "large") largeCvs.add(1);
    }
  }
  request(
    "GET",
    `/api/students/${a.code}/history`,
    "student_history",
    a.studentCookie
  );
  // One upload per >20 s: below the shared five-upload/minute allowance.
  sleep(20);
}

export default function runCapacity() {
  if (workload === "heavy") heavy();
  else {
    homepage();
    if (workload === "homepage-concurrency") sleep(1);
  }
}
