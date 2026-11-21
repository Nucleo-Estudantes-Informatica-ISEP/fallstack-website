// Only synthetic fixture accounts; guarded local or explicitly approved staging.
import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";
import { minioPost } from "./minioPost.js";

import { Counter, Rate, Trend } from "k6/metrics";

const base = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
if (__ENV.E2E_ALLOW_UPLOADS !== "yes" || __ENV.CONFIRM_SYNTHETIC_DATA !== "yes")
  throw new Error("Confirm disposable uploads and synthetic fixture data");
const fixtures = JSON.parse(open(__ENV.UPLOAD_FIXTURES));
const bytes = open(__ENV.UPLOAD_PDF, "b");
const uploads = Number(__ENV.UPLOAD_VUS || 20);
const businessVus = Number(__ENV.BUSINESS_VUS || 0);
const iterations = Number(__ENV.BUSINESS_ITERATIONS || 20);
if (
  ![0, 5, 10, 20, 40].includes(uploads) ||
  fixtures.uploads.length < uploads ||
  fixtures.business.length < businessVus ||
  ![5 * 1024 * 1024, 10 * 1024 * 1024].includes(bytes.byteLength)
)
  throw new Error(
    "Use 5/10/20/40 uploads, 5/10 MiB PDF, and enough distinct fixtures"
  );
if (businessVus && fixtures.business.some((b) => b.targets.length < iterations))
  throw new Error(
    "Provide unique student/company and student/action pairs for every business iteration"
  );
const authorization = new Trend("cv_authorization_ms", true);
const transfer = new Trend("cv_transfer_ms", true);
const finalization = new Trend("cv_finalization_ms", true);
const total = new Trend("cv_total_ms", true);
const transferStarted = new Trend("cv_transfer_started_ms", true);
const transferEnded = new Trend("cv_transfer_ended_ms", true);
const success = new Rate("cv_success");
const timeouts = new Counter("cv_timeouts");
const completed = new Counter("cv_completed");
const business = new Trend("business_ms", true);
const businessSuccess = new Rate("business_success");
export const options = {
  maxRedirects: 0,
  summaryTrendStats: ["avg", "med", "min", "p(95)", "p(99)", "max"],
  scenarios: {
    ...(uploads
      ? {
          uploads: {
            executor: "per-vu-iterations",
            exec: "upload",
            vus: uploads,
            iterations: 1,
            startTime: businessVus ? "2s" : "0s",
            maxDuration: "3m",
          },
        }
      : {}),
    ...(businessVus
      ? {
          business: {
            executor: "per-vu-iterations",
            exec: "operations",
            vus: businessVus,
            iterations,
            maxDuration: "3m",
          },
        }
      : {}),
  },
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate<0.01"],
    ...(uploads ? { cv_success: ["rate==1"], cv_timeouts: ["count==0"] } : {}),
    ...(businessVus
      ? {
          business_success: ["rate==1"],
          business_ms: ["p(95)<1000", "p(99)<2000"],
          "business_ms{operation:stand_scan}": ["p(95)<1000", "p(99)<2000"],
          "business_ms{operation:action_checkin}": ["p(95)<1000", "p(99)<2000"],
        }
      : {}),
  },
};
function params(cookie, name) {
  return {
    headers: {
      ...(cookie ? { Cookie: cookie, Origin: base } : {}),
      "Content-Type": "application/json",
    },
    tags: { name },
    timeout: "30s",
  };
}
function json(response, field) {
  try {
    return response.json(field);
  } catch {
    return undefined;
  }
}
export function upload() {
  const user = fixtures.uploads[exec.scenario.iterationInTest];
  const started = Date.now();
  let done = false;
  let alignmentWait = 0;
  try {
    const auth = http.post(
      `${base}/api/storage/cv`,
      JSON.stringify({
        filename: "load.pdf",
        contentType: "application/pdf",
        size: bytes.byteLength,
      }),
      params(user.cookie, "cv_authorize")
    );
    authorization.add(auth.timings.duration);
    if (auth.status === 0) timeouts.add(1);
    if (!check(auth, { "CV authorized": (r) => r.status === 201 })) return;
    const post = auth.json();
    const destination = /^https?:\/\/[^/]+/.exec(post.url)?.[0];
    if (destination !== fixtures.storageOrigin)
      throw new Error("Unexpected signed storage origin");
    // No application cookies; explicitly keep file last in the multipart body.
    const multipart = minioPost(post.fields, bytes);
    const wait = Math.max(0, 3000 - exec.instance.currentTestRunDuration);
    const beforeWait = Date.now();
    if (wait) sleep(wait / 1000);
    alignmentWait = Date.now() - beforeWait;
    transferStarted.add(exec.instance.currentTestRunDuration);
    const sent = http.post(post.url, multipart.body, {
      headers: { "Content-Type": multipart.contentType },
      tags: { name: "cv_direct_transfer" },
      timeout: "120s",
    });
    transfer.add(sent.timings.duration);
    transferEnded.add(exec.instance.currentTestRunDuration);
    if (sent.status !== 204)
      console.error(
        JSON.stringify({
          phase: "transfer",
          status: sent.status,
          errorCode: sent.error_code,
        })
      );
    if (sent.status === 0) timeouts.add(1);
    if (!check(sent, { "MinIO accepted direct POST": (r) => r.status === 204 }))
      return;
    let finished;
    const finishStart = Date.now();
    for (let attempt = 0; attempt < 4; attempt++) {
      finished = http.post(
        `${base}/api/storage/cv/finalize`,
        JSON.stringify({ uploadId: post.uploadId }),
        params(user.cookie, "cv_finalize")
      );
      if (![409, 503].includes(finished.status)) break;
      sleep(0.5 * 2 ** attempt);
    }
    finalization.add(Date.now() - finishStart);
    if (finished.status === 0) timeouts.add(1);
    done = check(finished, {
      "CV verified and associated": (r) => r.status === 200 && !!json(r, "id"),
    });
    if (done) completed.add(1);
  } finally {
    success.add(done);
    total.add(Date.now() - started - alignmentWait);
  }
}
function businessCheck(response, expected, name) {
  if (response.status !== expected)
    console.error(JSON.stringify({ operation: name, status: response.status }));
  business.add(response.timings.duration, { operation: name });
  const ok = check(response, { [name]: (r) => r.status === expected });
  businessSuccess.add(ok);
}
export function operations() {
  // Global VU ids can interleave across scenarios. Scenario iteration ids are
  // unique, so every scan/check-in gets a fresh student/company/action pair.
  const iteration = exec.scenario.iterationInTest;
  const fixture = fixtures.business[iteration % businessVus];
  const target = fixture.targets[Math.floor(iteration / businessVus)];
  const qr = http.get(
    `${base}/api/qrcode`,
    params(target.cookie, "student_qr")
  );
  businessCheck(qr, 200, "student_qr");
  const exchange = http.post(
    `${base}/api/students/token`,
    JSON.stringify({ token: json(qr, "data") }),
    params(fixture.employeeCookie, "preview_credential")
  );
  businessCheck(exchange, 200, "preview_credential");
  const scan = http.post(
    `${base}/api/saved`,
    JSON.stringify({ token: json(exchange, "token") }),
    params(fixture.employeeCookie, "stand_scan")
  );
  businessCheck(scan, 201, "stand_scan");
  const action = http.get(
    `${base}/api/actions/${fixtures.actionId}`,
    params(fixtures.actionPresenterCookie, "action_qr")
  );
  businessCheck(action, 200, "action_qr");
  const token = (json(action, "qrCode") || "").replace(/^action-/, "");
  businessCheck(
    http.post(
      `${base}/api/actions/${token}`,
      null,
      params(target.cookie, "action_checkin")
    ),
    200,
    "action_checkin"
  );
  for (const [path, cookie, name] of [
    [`/api/students/${target.code}/history`, target.cookie, "student_history"],
    [`/api/students/${target.code}`, target.cookie, "student_profile"],
    ["/api/companies/history", fixture.employeeCookie, "company_history"],
  ])
    businessCheck(http.get(base + path, params(cookie, name)), 200, name);
  sleep(0.25);
}
export function handleSummary(data) {
  // Contains aggregate metrics only. Never serialize fixture cookies or URLs.
  return {
    [__ENV.UPLOAD_SUMMARY || "direct-cv-summary.json"]: JSON.stringify(
      data,
      null,
      2
    ),
  };
}
