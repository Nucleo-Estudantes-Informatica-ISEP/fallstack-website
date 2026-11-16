/** Pure helpers for heavy-users.js, shared by k6 and Vitest (no k6 or Node APIs). */

export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOADS_PER_MINUTE_LIMIT = 5;
export const CHECK_INS_PER_MINUTE_LIMIT = 60;

// Realistic CV sizes, with every fifth upload exactly at the 10 MiB limit.
export const CV_SIZE_PLAN = [
  180 * 1024,
  450 * 1024,
  1200 * 1024,
  3 * 1024 * 1024,
  CV_MAX_BYTES,
];

export function parseList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function cvSizeFor(vu, iteration) {
  // Offset by VU so concurrent near-limit uploads are spread across the run.
  return CV_SIZE_PLAN[(vu + iteration) % CV_SIZE_PLAN.length];
}

export function isNearLimit(size) {
  return size >= CV_MAX_BYTES * 0.9;
}

/** A valid one-page PDF of exactly `size` bytes (ASCII, so length == bytes). */
export function cvPdf(size) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const content = "BT /F1 12 Tf 72 720 Td (Synthetic heavy-user CV) Tj ET\n";
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);

  const build = (padding) => {
    let pdf = `%PDF-1.7\n%${"synthetic CV ".repeat(padding / 13 + 1).slice(0, padding)}\n`;
    const offsets = [];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join(
        ""
      )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return pdf;
  };

  const base = build(0).length;
  if (size < base) throw new Error(`CV size must be at least ${base} bytes.`);
  let padding = size - base;
  let pdf = build(padding);
  // The startxref digit count can grow with the padding; settle it.
  for (let attempt = 0; pdf.length !== size && attempt < 3; attempt++) {
    padding -= pdf.length - size;
    pdf = build(padding);
  }
  if (pdf.length !== size) throw new Error("Could not size the CV fixture.");
  return pdf;
}

function numberOr(value, fallback) {
  return value === undefined || value === "" ? fallback : Number(value);
}

function requireDistinct(name, values) {
  if (new Set(values).size !== values.length)
    throw new Error(`${name} must contain distinct entries.`);
}

function requirePositiveInteger(name, value) {
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} must be a non-negative integer.`);
}

/**
 * Validates and normalises the run configuration from k6 `__ENV`. Every VU owns
 * exactly one account, and no account is shared between the three groups.
 */
export function heavyUserPlan(env) {
  if (env.E2E_ALLOW_UPLOADS !== "yes")
    throw new Error(
      "Set E2E_ALLOW_UPLOADS=yes for disposable staging CV uploads."
    );

  const plan = {
    dashboard: {
      users: numberOr(env.DASHBOARD_USERS, 40),
      cookies: parseList(env.DASHBOARD_EMPLOYEE_COOKIES),
      intervalSeconds: numberOr(env.DASHBOARD_INTERVAL_SECONDS, 10),
      downloadsPerVisit: numberOr(env.DASHBOARD_DOWNLOADS_PER_VISIT, 2),
    },
    qr: {
      users: numberOr(env.QR_USERS, 140),
      cookies: parseList(env.QR_STUDENT_COOKIES),
      codes: parseList(env.QR_STUDENT_CODES),
      uploadIntervalSeconds: numberOr(env.UPLOAD_INTERVAL_SECONDS, 15),
      actionId: env.ACTION_ID || "",
    },
    checkIn: {
      users: numberOr(env.CHECKIN_USERS, 20),
      cookies: parseList(env.CHECKIN_STAFF_COOKIES),
      studentCodes: parseList(env.CHECKIN_STUDENT_CODES),
      sessionId: env.CHECKIN_SESSION_ID || "",
      intervalSeconds: numberOr(env.CHECKIN_INTERVAL_SECONDS, 3),
    },
    rampSeconds: numberOr(env.RAMP_SECONDS, 60),
    holdSeconds: numberOr(env.HOLD_SECONDS, 180),
  };

  requirePositiveInteger("DASHBOARD_USERS", plan.dashboard.users);
  requirePositiveInteger("QR_USERS", plan.qr.users);
  requirePositiveInteger("CHECKIN_USERS", plan.checkIn.users);
  requirePositiveInteger(
    "DASHBOARD_DOWNLOADS_PER_VISIT",
    plan.dashboard.downloadsPerVisit
  );
  if (plan.dashboard.users + plan.qr.users + plan.checkIn.users < 1)
    throw new Error("At least one heavy user is required.");
  for (const [name, value] of [
    ["RAMP_SECONDS", plan.rampSeconds],
    ["HOLD_SECONDS", plan.holdSeconds],
  ])
    if (!Number.isInteger(value) || value < 1)
      throw new Error(`${name} must be a positive integer.`);

  // One distinct account per VU, so per-account limits stay meaningful.
  for (const [name, users, cookies] of [
    [
      "DASHBOARD_EMPLOYEE_COOKIES",
      plan.dashboard.users,
      plan.dashboard.cookies,
    ],
    ["QR_STUDENT_COOKIES", plan.qr.users, plan.qr.cookies],
    ["CHECKIN_STAFF_COOKIES", plan.checkIn.users, plan.checkIn.cookies],
  ]) {
    requireDistinct(name, cookies);
    if (cookies.length < users)
      throw new Error(
        `${name} needs one distinct account per VU (${users}); got ${cookies.length}.`
      );
  }
  const allCookies = [
    ...plan.dashboard.cookies.slice(0, plan.dashboard.users),
    ...plan.qr.cookies.slice(0, plan.qr.users),
    ...plan.checkIn.cookies.slice(0, plan.checkIn.users),
  ];
  if (new Set(allCookies).size !== allCookies.length)
    throw new Error(
      "Dashboard, QR and check-in groups must use distinct accounts."
    );

  if (plan.qr.users > 0) {
    requireDistinct("QR_STUDENT_CODES", plan.qr.codes);
    if (plan.qr.codes.length !== plan.qr.cookies.length)
      throw new Error(
        "QR_STUDENT_CODES must list each QR student's code in cookie order."
      );
    const uploadsPerMinute = 60 / plan.qr.uploadIntervalSeconds;
    if (
      !Number.isFinite(uploadsPerMinute) ||
      plan.qr.uploadIntervalSeconds <= 0 ||
      uploadsPerMinute > UPLOADS_PER_MINUTE_LIMIT
    )
      throw new Error(
        `UPLOAD_INTERVAL_SECONDS must be at least ${60 / UPLOADS_PER_MINUTE_LIMIT} (max ${UPLOADS_PER_MINUTE_LIMIT} uploads per minute per student).`
      );
  }

  if (plan.dashboard.users > 0 && !(plan.dashboard.intervalSeconds > 0))
    throw new Error("DASHBOARD_INTERVAL_SECONDS must be a positive number.");

  if (plan.checkIn.users > 0) {
    if (!plan.checkIn.sessionId)
      throw new Error(
        "Set CHECKIN_SESSION_ID to a schedule session that is live during the run."
      );
    if (plan.checkIn.studentCodes.length === 0)
      throw new Error("Set CHECKIN_STUDENT_CODES for the check-in group.");
    requireDistinct("CHECKIN_STUDENT_CODES", plan.checkIn.studentCodes);
    if (
      !(plan.checkIn.intervalSeconds > 0) ||
      60 / plan.checkIn.intervalSeconds > CHECK_INS_PER_MINUTE_LIMIT
    )
      throw new Error(
        `CHECKIN_INTERVAL_SECONDS must be at least ${60 / CHECK_INS_PER_MINUTE_LIMIT} (staff limit ${CHECK_INS_PER_MINUTE_LIMIT}/min).`
      );
  }

  return plan;
}

/**
 * Maps k6 VU ids (1..total) to a group and a per-group account index. Groups
 * are interleaved in proportion, so the one-minute ramp-up mixes all three.
 */
export function roleTable(plan) {
  const groups = [
    ["dashboard", plan.dashboard.users],
    ["qr", plan.qr.users],
    ["checkIn", plan.checkIn.users],
  ];
  const total = groups.reduce((sum, [, users]) => sum + users, 0);
  const assigned = { dashboard: 0, qr: 0, checkIn: 0 };
  const table = [];
  for (let slot = 1; slot <= total; slot++) {
    let best = null;
    let bestDeficit = -Infinity;
    for (const [group, users] of groups) {
      if (assigned[group] >= users) continue;
      const deficit = (users * slot) / total - assigned[group];
      if (deficit > bestDeficit) {
        best = group;
        bestDeficit = deficit;
      }
    }
    table.push({ group: best, index: assigned[best]++ });
  }
  return table;
}

/** Credential a staff VU checks in on a given iteration; spreads VUs apart. */
export function checkInCodeFor(codes, vuIndex, iteration, staffCount) {
  const stride = Math.max(
    1,
    Math.floor(codes.length / Math.max(staffCount, 1))
  );
  return codes[(vuIndex * stride + iteration) % codes.length];
}

/**
 * Thresholds that fail the run unless the CV workload really happened. Expected
 * 429s and 404s are not errors, so without these a run where every upload is
 * rate limited, or every CV lookup finds nothing, could still pass. Each CV
 * size class (real and near-limit) must be both uploaded and downloaded back.
 * k6 fails a count threshold on a metric with no samples, so zero successes
 * fail. Groups that are disabled, or dashboards with downloads switched off,
 * add no threshold.
 */
export function workloadThresholds(plan) {
  const thresholds = {};
  if (plan.qr.users > 0)
    for (const size of ["real", "near_limit"]) {
      thresholds[`cv_upload_accepted{size:${size}}`] = ["count>0"];
      thresholds[`cv_download_succeeded{group:qr,size:${size}}`] = ["count>0"];
    }
  if (plan.dashboard.users > 0 && plan.dashboard.downloadsPerVisit > 0)
    thresholds["cv_download_succeeded{group:dashboard}"] = ["count>0"];
  return thresholds;
}
