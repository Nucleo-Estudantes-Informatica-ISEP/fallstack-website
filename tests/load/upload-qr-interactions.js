// Opt-in staging traffic; no identifiers, cookies or returned tokens are logged.
import { check, sleep } from "k6";
// Valid 1x1 PNG, decoded locally into an ArrayBuffer for k6's multipart encoder.
import encoding from "k6/encoding";
import http from "k6/http";

import { assertStagingTarget } from "../stagingTarget.js";

const base = assertStagingTarget(
  __ENV.E2E_BASE_URL,
  __ENV.STAGING_BASE_URL,
  __ENV.CONFIRM_NON_PRODUCTION
);
const students = (__ENV.STUDENT_COOKIES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const employees = (__ENV.EMPLOYEE_COOKIES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const codes = (__ENV.STUDENT_CODES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const vus = Number(__ENV.VUS || 1);
const interval = Number(__ENV.REQUEST_INTERVAL_SECONDS || 20);
if (
  !Number.isInteger(vus) ||
  vus < 1 ||
  students.length < vus ||
  employees.length < vus ||
  codes.length < vus
)
  throw new Error(
    "Provide one synthetic student session, employee session and valid student code per VU"
  );
if (
  new Set(students).size !== students.length ||
  new Set(employees).size !== employees.length
)
  throw new Error("Use distinct synthetic accounts for each VU");
if (!Number.isFinite(interval) || interval < 15)
  throw new Error(
    "Normal traffic requires at least 15 seconds between uploads per endpoint"
  );
if (__ENV.E2E_ALLOW_UPLOADS !== "yes")
  throw new Error("Set E2E_ALLOW_UPLOADS=yes for disposable staging uploads");

export const options = {
  maxRedirects: 0,
  scenarios: {
    mixed: {
      executor: "constant-vus",
      vus,
      duration: "3m",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};
const pdf = http.file(
  "%PDF-1.4\n%%EOF\n",
  "limiter-check.pdf",
  "application/pdf"
);

const png = http.file(
  encoding.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0MsAAAAASUVORK5CYII="
  ),
  "limiter-check.png",
  "image/png"
);

export default function runInteractions() {
  const index = __VU - 1;
  for (const [kind, file] of [
    ["cv", pdf],
    ["avatar", png],
  ]) {
    const response = http.post(
      `${base}/api/storage/${kind}`,
      { file },
      { headers: { Cookie: students[index] }, tags: { name: `upload_${kind}` } }
    );
    check(response, {
      "normal upload returns 201": (res) => res.status === 201,
    });
  }
  // Exercise employee preview issuance, rather than the public action-QR route.
  const scan = http.post(
    `${base}/api/students/token`,
    JSON.stringify({ code: codes[index] }),
    {
      headers: { Cookie: employees[index], "Content-Type": "application/json" },
      tags: { name: "student_preview_scan" },
    }
  );
  check(scan, {
    "valid preview scan returns a token": (res) =>
      res.status === 200 && Boolean(res.json("token")),
  });
  sleep(interval);
}
