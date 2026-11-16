// 200 heavy users (Task01-C2): employee dashboards with CV downloads, student
// QR passes with real and near-limit CV uploads, and staff session check-ins.
// Opt-in staging traffic; no cookies, codes or returned tokens are logged.
import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";
import {
  checkInCodeFor,
  cvPdf,
  cvSizeFor,
  heavyUserPlan,
  isNearLimit,
  roleTable,
  workloadThresholds,
} from "./heavyUserPlan.js";

import { Counter, Trend } from "k6/metrics";

const baseUrl = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
const plan = heavyUserPlan(__ENV);
const roles = roleTable(plan);

// Expected non-2xx outcomes are counted here instead of as HTTP failures.
const uploadsAccepted = new Counter("cv_upload_accepted");
const uploadsRateLimited = new Counter("cv_upload_rate_limited_429");
const nearLimitUploads = new Counter("cv_upload_near_limit_accepted");
// Only downloads that passed every check (tag: group).
const downloadsSucceeded = new Counter("cv_download_succeeded");
const downloadsUnavailable = new Counter("cv_download_unavailable_404");
const checkInsCreated = new Counter("checkin_created");
const checkInsDuplicate = new Counter("checkin_duplicate_409");
const uploadDuration = new Trend("cv_upload_duration", true);
const downloadDuration = new Trend("cv_download_duration", true);

const lightEndpointP95 = ["p(95)<750"];

export const options = {
  // Never follow a staging redirect to production.
  maxRedirects: 0,
  scenarios: {
    heavy_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: `${plan.rampSeconds}s`, target: roles.length },
        { duration: `${plan.holdSeconds}s`, target: roles.length },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // Pass limit: under 1% errors; expected 429/409/404 are excluded.
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    // File transfers are reported through the cv_* trends without a bar.
    "http_req_duration{name:dashboard_page}": lightEndpointP95,
    "http_req_duration{name:dashboard_history}": lightEndpointP95,
    "http_req_duration{name:qr_pass}": lightEndpointP95,
    "http_req_duration{name:cv_attach}": lightEndpointP95,
    "http_req_duration{name:checkin}": lightEndpointP95,
    // Uploads and downloads of both CV sizes must each happen.
    ...workloadThresholds(plan),
  },
};

function cookieHeaders(cookie, extra = {}) {
  return { headers: { Cookie: cookie, ...extra } };
}

function json(res, path) {
  try {
    // k6 treats an explicit undefined selector as a path, so omit it.
    return path === undefined ? res.json() : res.json(path);
  } catch {
    return undefined;
  }
}

function paceFrom(startedAt, intervalSeconds) {
  sleep(Math.max(0, intervalSeconds - (Date.now() - startedAt) / 1000));
}

// Counts a success only when every check passes, including the byte count
// when the caller knows what it uploaded (`expected` = {bytes, size}).
function downloadCv(cookie, code, group, expected) {
  const lookup = http.get(
    `${baseUrl}/api/students/${encodeURIComponent(code)}/cv`,
    {
      ...cookieHeaders(cookie),
      responseCallback: http.expectedStatuses(200, 404),
      tags: { name: "cv_lookup", group },
    }
  );
  if (lookup.status === 404) {
    downloadsUnavailable.add(1, { group });
    return false;
  }
  const url = json(lookup, "url");
  if (!check(lookup, { "CV lookup returns a file URL": () => Boolean(url) }))
    return false;
  const file = http.get(`${baseUrl}${url}`, {
    ...cookieHeaders(cookie),
    responseType: "binary",
    tags: { name: "cv_download", group },
  });
  downloadDuration.add(file.timings.duration, { group });
  const checks = {
    "CV download returns a PDF": (res) =>
      res.status === 200 &&
      (res.headers["Content-Type"] || "").includes("application/pdf"),
  };
  if (expected)
    checks["student downloads the CV just uploaded"] = (res) =>
      Boolean(res.body) && res.body.byteLength === expected.bytes;
  const succeeded = check(file, checks);
  if (succeeded)
    downloadsSucceeded.add(
      1,
      expected ? { group, size: expected.size } : { group }
    );
  return succeeded;
}

export function runDashboard(index) {
  const startedAt = Date.now();
  const cookie = plan.dashboard.cookies[index];
  const page = http.get(`${baseUrl}/dashboard`, {
    ...cookieHeaders(cookie),
    tags: { name: "dashboard_page", group: "dashboard" },
  });
  check(page, {
    "dashboard returns HTML": (res) =>
      res.status === 200 &&
      (res.headers["Content-Type"] || "").includes("text/html"),
  });

  const history = http.get(`${baseUrl}/api/companies/history`, {
    ...cookieHeaders(cookie),
    tags: { name: "dashboard_history", group: "dashboard" },
  });
  const saved = json(history);
  check(history, {
    "dashboard history returns a list": (res) =>
      res.status === 200 && Array.isArray(saved),
  });
  if (plan.dashboard.downloadsPerVisit > 0 && Array.isArray(saved)) {
    check(saved, {
      "dashboard company has saved students to download": (items) =>
        items.length > 0,
    });
    const count = Math.min(plan.dashboard.downloadsPerVisit, saved.length);
    const iteration = exec.vu.iterationInScenario;
    for (let i = 0; i < count; i++) {
      const entry = saved[(iteration * count + i) % saved.length];
      if (entry && entry.student && entry.student.code)
        downloadCv(cookie, entry.student.code, "dashboard");
    }
  }
  paceFrom(startedAt, plan.dashboard.intervalSeconds);
}

export function runQr(index) {
  const startedAt = Date.now();
  const cookie = plan.qr.cookies[index];
  const code = plan.qr.codes[index];

  const pass = http.get(`${baseUrl}/api/qrcode`, {
    ...cookieHeaders(cookie),
    tags: { name: "qr_pass", group: "qr" },
  });
  check(pass, {
    "student QR pass returns a token": (res) =>
      res.status === 200 && Boolean(json(res, "data")),
  });

  if (plan.qr.actionId) {
    const action = http.get(
      `${baseUrl}/api/actions/${encodeURIComponent(plan.qr.actionId)}`,
      { tags: { name: "action_qr", group: "qr" } }
    );
    const qrCode = json(action, "qrCode");
    if (check(action, { "action QR returns a code": () => Boolean(qrCode) })) {
      const scan = http.post(
        `${baseUrl}/api/actions/${encodeURIComponent(qrCode)}`,
        null,
        {
          ...cookieHeaders(cookie),
          tags: { name: "action_scan", group: "qr" },
        }
      );
      check(scan, { "action QR scan completes": (res) => res.status === 200 });
    }
  }

  // One upload per iteration; pacing keeps each student at most 5 per minute.
  const size = cvSizeFor(exec.vu.idInTest, exec.vu.iterationInScenario);
  const sizeClass = isNearLimit(size) ? "near_limit" : "real";
  const upload = http.post(
    `${baseUrl}/api/storage/cv`,
    { file: http.file(cvPdf(size), "cv.pdf", "application/pdf") },
    {
      ...cookieHeaders(cookie),
      responseCallback: http.expectedStatuses(201, 429),
      tags: { name: "cv_upload", group: "qr", size: sizeClass },
    }
  );
  uploadDuration.add(upload.timings.duration, { size: sizeClass });
  if (upload.status === 429) {
    uploadsRateLimited.add(1, { size: sizeClass });
  } else {
    const id = json(upload, "id");
    const accepted = check(upload, {
      "CV upload returns 201 with a file id": (res) =>
        res.status === 201 && Boolean(id),
    });
    if (accepted) {
      uploadsAccepted.add(1, { size: sizeClass });
      if (sizeClass === "near_limit") nearLimitUploads.add(1);
      const attach = http.post(
        `${baseUrl}/api/students/${encodeURIComponent(code)}/cv`,
        JSON.stringify({ id }),
        {
          ...cookieHeaders(cookie, { "Content-Type": "application/json" }),
          tags: { name: "cv_attach", group: "qr" },
        }
      );
      const attached = check(attach, {
        "CV attaches to the student": (res) => res.status === 200,
      });
      if (attached)
        downloadCv(cookie, code, "qr", { bytes: size, size: sizeClass });
    }
  }
  paceFrom(startedAt, plan.qr.uploadIntervalSeconds);
}

export function runCheckIn(index) {
  const startedAt = Date.now();
  const code = checkInCodeFor(
    plan.checkIn.studentCodes,
    index,
    exec.vu.iterationInScenario,
    plan.checkIn.users
  );
  const response = http.post(
    `${baseUrl}/api/sessions/${encodeURIComponent(plan.checkIn.sessionId)}/check-ins`,
    JSON.stringify({ code }),
    {
      ...cookieHeaders(plan.checkIn.cookies[index], {
        "Content-Type": "application/json",
      }),
      responseCallback: http.expectedStatuses(201, 409),
      tags: { name: "checkin", group: "checkIn" },
    }
  );
  if (response.status === 409) checkInsDuplicate.add(1);
  else if (
    check(response, { "check-in returns 201": (res) => res.status === 201 })
  )
    checkInsCreated.add(1);
  paceFrom(startedAt, plan.checkIn.intervalSeconds);
}

export default function runHeavyUser() {
  const role = roles[exec.vu.idInTest - 1];
  if (!role) return;
  if (role.group === "dashboard") runDashboard(role.index);
  else if (role.group === "qr") runQr(role.index);
  else runCheckIn(role.index);
}
