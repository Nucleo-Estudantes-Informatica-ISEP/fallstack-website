// 200 heavy users (Task01-C2): employee dashboards with CV downloads, student
// QR passes with real and near-limit CV uploads, and staff session check-ins.
// Opt-in staging traffic; no cookies, codes or returned tokens are logged.
import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";
import {
  checkInCodeFor,
  cvPdfBytes,
  cvSizeFor,
  heavyUserPlan,
  isNearLimit,
  roleTable,
  workloadThresholds,
} from "./heavyUserPlan.js";
import { minioPost } from "./minioPost.js";

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
const actionAlreadyCompleted = new Counter("action_scan_already_completed_400");
// Authorize + storage transfer + finalize, as the student waits for it.
const uploadDuration = new Trend("cv_upload_duration", true);
const downloadDuration = new Trend("cv_download_duration", true);

const lightEndpointP95 = ["p(95)<750"];
// completeActionById's error for a student who already completed the action.
const ACTION_ALREADY_COMPLETED = "Já completaste esta ação";

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
    // Storage transfers, finalization and downloads are reported through the
    // cv_* trends without a bar.
    "http_req_duration{name:dashboard_page}": lightEndpointP95,
    "http_req_duration{name:cv_authorize}": lightEndpointP95,
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

// Runs one visit, then waits out the rest of the interval measured from its
// start. The wait is in `finally` so a script error can never skip it and
// turn a VU into a tight loop that breaks the per-account limits. k6 does
// not count exceptions as failed checks, so record one before rethrowing.
function paced(intervalSeconds, visit) {
  const startedAt = Date.now();
  try {
    visit();
  } catch (error) {
    check(null, { "visit completes without a script error": () => false });
    throw error;
  } finally {
    sleep(Math.max(0, intervalSeconds - (Date.now() - startedAt) / 1000));
  }
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
}

export function runQr(index) {
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

  // An action completes once per student, so only the first iteration scans.
  if (plan.qr.actionId && exec.vu.iterationInScenario === 0) {
    const action = http.get(
      `${baseUrl}/api/actions/${encodeURIComponent(plan.qr.actionId)}`,
      { tags: { name: "action_qr", group: "qr" } }
    );
    const qrCode = json(action, "qrCode");
    if (check(action, { "action QR returns a code": () => Boolean(qrCode) })) {
      // The QR encodes "action-<jwt>"; the student app posts the bare JWT.
      const token = String(qrCode).replace(/^action-/, "");
      const scan = http.post(
        `${baseUrl}/api/actions/${encodeURIComponent(token)}`,
        null,
        {
          ...cookieHeaders(cookie),
          // A rerun with the same accounts finds the action already done.
          responseCallback: http.expectedStatuses(200, 400),
          tags: { name: "action_scan", group: "qr" },
        }
      );
      const alreadyCompleted =
        scan.status === 400 && json(scan, "error") === ACTION_ALREADY_COMPLETED;
      if (alreadyCompleted) actionAlreadyCompleted.add(1);
      else
        check(scan, {
          "action QR scan completes": (res) => res.status === 200,
        });
    }
  }

  // One upload per iteration; pacing keeps each student at most 5 per minute.
  const size = cvSizeFor(exec.vu.idInTest, exec.vu.iterationInScenario);
  const sizeClass = isNearLimit(size) ? "near_limit" : "real";
  const id = uploadCv(cookie, size, sizeClass);
  if (id) {
    // The student app still posts the finalized id; it is a no-op once the
    // finalize step has attached the CV.
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

// The direct upload contract (#595): authorize with the app, send the bytes
// straight to the signed storage URL, then finalize with the app. Returns the
// finalized CV id, or null when the upload was rate limited or failed.
function uploadCv(cookie, size, sizeClass) {
  const tags = { group: "qr", size: sizeClass };
  // Render before timing starts, so generator CPU stays out of the results.
  const pdf = cvPdfBytes(size);
  const startedAt = Date.now();
  const authorize = http.post(
    `${baseUrl}/api/storage/cv`,
    JSON.stringify({
      filename: "cv.pdf",
      contentType: "application/pdf",
      size,
    }),
    {
      ...cookieHeaders(cookie, { "Content-Type": "application/json" }),
      responseCallback: http.expectedStatuses(201, 429),
      tags: { name: "cv_authorize", ...tags },
    }
  );
  if (authorize.status === 429) {
    uploadsRateLimited.add(1, { size: sizeClass });
    return null;
  }
  const ticket = json(authorize);
  const target =
    ticket && typeof ticket.url === "string"
      ? (/^https?:\/\/[^/]+/.exec(ticket.url) || [""])[0]
      : "";
  // Never send CV bytes anywhere but the pinned staging storage origin.
  if (
    !check(authorize, {
      "CV upload authorized for the staging storage origin": (res) =>
        res.status === 201 &&
        Boolean(ticket && ticket.uploadId && ticket.fields) &&
        target === plan.qr.storageOrigin,
    })
  )
    return null;

  // No application cookies: the signed form fields are the only credential.
  const form = minioPost(ticket.fields, pdf);
  const transfer = http.post(ticket.url, form.body, {
    headers: { "Content-Type": form.contentType },
    timeout: "120s",
    tags: { name: "cv_direct_transfer", ...tags },
  });
  if (
    !check(transfer, {
      "storage accepts the signed CV transfer": (res) => res.status === 204,
    })
  )
    return null;

  // Retry like the student app: 409 means finalization is still in progress;
  // a 503 is retried too but still counts as a failed request.
  let finalize;
  for (let attempt = 0; attempt < 3; attempt++) {
    finalize = http.post(
      `${baseUrl}/api/storage/cv/finalize`,
      JSON.stringify({ uploadId: ticket.uploadId }),
      {
        ...cookieHeaders(cookie, { "Content-Type": "application/json" }),
        responseCallback: http.expectedStatuses(200, 409),
        tags: { name: "cv_finalize", ...tags },
      }
    );
    if (finalize.status !== 409 && finalize.status !== 503) break;
    if (attempt < 2) sleep(0.5 * 2 ** attempt);
  }
  uploadDuration.add(Date.now() - startedAt, { size: sizeClass });
  const id = json(finalize, "id");
  if (
    !check(finalize, {
      "CV upload finalized with a file id": (res) =>
        res.status === 200 && Boolean(id),
    })
  )
    return null;
  uploadsAccepted.add(1, { size: sizeClass });
  if (sizeClass === "near_limit") nearLimitUploads.add(1);
  return id;
}

export function runCheckIn(index) {
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
}

export default function runHeavyUser() {
  const role = roles[exec.vu.idInTest - 1];
  if (!role) return;
  if (role.group === "dashboard")
    paced(plan.dashboard.intervalSeconds, () => runDashboard(role.index));
  else if (role.group === "qr")
    paced(plan.qr.uploadIntervalSeconds, () => runQr(role.index));
  else paced(plan.checkIn.intervalSeconds, () => runCheckIn(role.index));
}
