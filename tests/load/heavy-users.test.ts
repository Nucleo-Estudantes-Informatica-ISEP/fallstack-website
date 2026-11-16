// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";

import {
  checkInCodeFor,
  CV_MAX_BYTES,
  CV_SIZE_PLAN,
  cvPdf,
  cvSizeFor,
  heavyUserPlan,
  isNearLimit,
  roleTable,
  workloadThresholds,
} from "./heavyUserPlan";

const accounts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${i}`).join(",");

function env(overrides: Record<string, string> = {}) {
  return {
    E2E_ALLOW_UPLOADS: "yes",
    DASHBOARD_USERS: "2",
    QR_USERS: "3",
    CHECKIN_USERS: "1",
    DASHBOARD_EMPLOYEE_COOKIES: accounts("employee", 2),
    QR_STUDENT_COOKIES: accounts("student", 3),
    QR_STUDENT_CODES: "1250001,1250002,1250003",
    CHECKIN_STAFF_COOKIES: accounts("staff", 1),
    CHECKIN_STUDENT_CODES: "1250101,1250102",
    CHECKIN_SESSION_ID: "session-1",
    ...overrides,
  };
}

describe("CV fixture", () => {
  test.each(CV_SIZE_PLAN)("builds a valid PDF of exactly %i bytes", (size) => {
    const pdf = cvPdf(size);
    expect(pdf.length).toBe(size);
    expect(pdf.startsWith("%PDF-1.7\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    const xref = Number(/startxref\n(\d+)\n/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) =>
      Number(match[1])
    );
    offsets.forEach((offset, index) =>
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true)
    );
  });

  test("mixes real sizes with uploads exactly at the 10 MiB limit", () => {
    const sizes = Array.from({ length: 10 }, (_, i) => cvSizeFor(1, i));
    expect(sizes.filter((size) => size === CV_MAX_BYTES)).toHaveLength(2);
    expect(sizes.filter(isNearLimit)).toHaveLength(2);
    expect(Math.min(...sizes)).toBeLessThan(1024 * 1024);
  });
});

describe("heavy-user plan", () => {
  test("defaults to 200 users split into dashboard, QR and check-in", () => {
    const defaults = heavyUserPlan({
      ...env({
        DASHBOARD_EMPLOYEE_COOKIES: accounts("employee", 40),
        QR_STUDENT_COOKIES: accounts("student", 140),
        QR_STUDENT_CODES: accounts("code", 140),
        CHECKIN_STAFF_COOKIES: accounts("staff", 20),
      }),
      DASHBOARD_USERS: "",
      QR_USERS: "",
      CHECKIN_USERS: "",
    });
    expect(defaults.dashboard.users).toBe(40);
    expect(defaults.qr.users).toBe(140);
    expect(defaults.checkIn.users).toBe(20);
  });

  test.each([
    [{ E2E_ALLOW_UPLOADS: "" }, /E2E_ALLOW_UPLOADS/],
    [{ QR_STUDENT_COOKIES: accounts("student", 2) }, /one distinct account/],
    [{ QR_STUDENT_COOKIES: "a,a,b" }, /distinct entries/],
    [{ CHECKIN_STAFF_COOKIES: "employee-0" }, /distinct accounts/],
    [{ QR_STUDENT_CODES: "1250001,1250002" }, /cookie order/],
    [{ UPLOAD_INTERVAL_SECONDS: "11" }, /max 5 uploads per minute/],
    [{ UPLOAD_INTERVAL_SECONDS: "0" }, /UPLOAD_INTERVAL_SECONDS/],
    [{ CHECKIN_SESSION_ID: "" }, /CHECKIN_SESSION_ID/],
    [{ CHECKIN_INTERVAL_SECONDS: "0.5" }, /staff limit/],
    [{ QR_USERS: "-1" }, /QR_USERS/],
  ])("rejects %o", (overrides, message) => {
    expect(() => heavyUserPlan(env(overrides))).toThrow(message);
  });

  test("accepts exactly five uploads per minute per student", () => {
    expect(
      heavyUserPlan(env({ UPLOAD_INTERVAL_SECONDS: "12" })).qr
        .uploadIntervalSeconds
    ).toBe(12);
  });

  test("role table gives every VU one distinct account and mixes groups", () => {
    const plan = heavyUserPlan(
      env({
        DASHBOARD_USERS: "40",
        QR_USERS: "140",
        CHECKIN_USERS: "20",
        DASHBOARD_EMPLOYEE_COOKIES: accounts("employee", 40),
        QR_STUDENT_COOKIES: accounts("student", 140),
        QR_STUDENT_CODES: accounts("code", 140),
        CHECKIN_STAFF_COOKIES: accounts("staff", 20),
      })
    );
    const table = roleTable(plan);
    expect(table).toHaveLength(200);
    for (const [group, users] of [
      ["dashboard", 40],
      ["qr", 140],
      ["checkIn", 20],
    ] as const) {
      const indices = table
        .filter((role) => role.group === group)
        .map((role) => role.index)
        .sort((a, b) => a - b);
      expect(indices).toEqual([...Array(users).keys()]);
    }
    // The first ten VUs started by the ramp already include all three groups.
    expect(new Set(table.slice(0, 10).map((role) => role.group)).size).toBe(3);
  });

  test("staff VUs start on different student codes", () => {
    const codes = ["a", "b", "c", "d", "e", "f"];
    expect(checkInCodeFor(codes, 0, 0, 3)).toBe("a");
    expect(checkInCodeFor(codes, 1, 0, 3)).toBe("c");
    expect(checkInCodeFor(codes, 2, 0, 3)).toBe("e");
    expect(checkInCodeFor(codes, 2, 2, 3)).toBe("a");
  });
});

// Run the real k6 script with HTTP replaced; k6 itself is not a Node module.
const scriptSource = readFileSync(
  new URL("./heavy-users.js", import.meta.url),
  "utf8"
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export const options", "const options")
  .replace("export default function", "function")
  .replace(/export function/g, "function");

type Response = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  timings: { duration: number };
  json: (path?: string) => unknown;
};
type Request = {
  method: string;
  url: string;
  body: unknown;
  params: {
    headers?: Record<string, string>;
    tags?: Record<string, string>;
    responseCallback?: unknown;
  };
};

function respond(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  return {
    status,
    headers,
    body,
    timings: { duration: 10 },
    // Mirrors k6: an explicit undefined selector does not return the body.
    json: (...args: [string?]) =>
      args.length === 0
        ? body
        : args[0] === undefined
          ? undefined
          : (body as Record<string, unknown>)[args[0]],
  };
}

function loadScript(
  route: (request: Request) => Response,
  overrides: Record<string, string> = {}
) {
  const requests: Request[] = [];
  const checks: { name: string; passed: boolean }[] = [];
  const counters: Record<string, number> = {};
  const vu = { idInTest: 1, iterationInScenario: 0 };
  const send = (method: string, url: string, body: unknown, params = {}) => {
    const request = { method, url, body, params } as Request;
    requests.push(request);
    return route(request);
  };
  const context = runInNewContext(
    `${scriptSource}\n({ runHeavyUser, runDashboard, runQr, runCheckIn, options, roles });`,
    {
      __ENV: {
        E2E_BASE_URL: "https://staging.example.org",
        STAGING_BASE_URL: "https://staging.example.org",
        CONFIRM_NON_PRODUCTION: "yes",
        ...env(overrides),
      },
      assertStagingTarget: (url: string) => url,
      checkInCodeFor,
      cvPdf,
      cvSizeFor,
      heavyUserPlan,
      isNearLimit,
      roleTable,
      workloadThresholds,
      exec: { vu },
      sleep: () => {},
      check: (
        value: unknown,
        predicates: Record<string, (v: unknown) => boolean>
      ) => {
        let all = true;
        for (const [name, predicate] of Object.entries(predicates)) {
          const passed = Boolean(predicate(value));
          checks.push({ name, passed });
          all &&= passed;
        }
        return all;
      },
      // Mirrors k6 sub-metrics: a sample also counts under name{tag:value}
      // for each tag, and under all its tags together (name{a:x,b:y}).
      Counter: class {
        constructor(private name: string) {}
        add(value: number, tags: Record<string, string> = {}) {
          const pairs = Object.entries(tags).map(
            ([tag, tagValue]) => `${tag}:${tagValue}`
          );
          const keys = new Set([
            this.name,
            ...pairs.map((pair) => `${this.name}{${pair}}`),
            ...(pairs.length > 1 ? [`${this.name}{${pairs.join(",")}}`] : []),
          ]);
          for (const key of keys) counters[key] = (counters[key] ?? 0) + value;
        }
      },
      Trend: class {
        add() {}
      },
      http: {
        file: (data: string) => ({ data }),
        expectedStatuses: (...statuses: number[]) => statuses,
        get: (url: string, params?: object) => send("GET", url, null, params),
        post: (url: string, body: unknown, params?: object) =>
          send("POST", url, body, params),
      },
    }
  );
  return { ...context, requests, checks, counters, vu };
}

const pdfHeaders = { "Content-Type": "application/pdf" };

describe("heavy-users k6 script", () => {
  test("ramps every heavy user within the configured minute", () => {
    const { options, roles } = loadScript(() => respond(200));
    expect(roles).toHaveLength(6);
    expect(options.scenarios.heavy_users.stages[0]).toEqual({
      duration: "60s",
      target: 6,
    });
    expect(options.maxRedirects).toBe(0);
    expect(options.thresholds.http_req_failed).toEqual(["rate<0.01"]);
  });

  test("student uploads, attaches and downloads the same CV", () => {
    let uploadedSize = 0;
    const script = loadScript((request) => {
      if (request.url.endsWith("/api/qrcode"))
        return respond(200, { data: "t" });
      if (request.url.endsWith("/api/storage/cv")) {
        uploadedSize = (request.body as { file: { data: string } }).file.data
          .length;
        return respond(201, { id: "file-1" });
      }
      if (request.method === "POST" && request.url.endsWith("/cv"))
        return respond(200, { ok: true });
      if (request.url.endsWith("/api/students/1250001/cv"))
        return respond(200, { url: "/api/students/1250001/cv/file" });
      if (request.url.endsWith("/cv/file"))
        return respond(200, { byteLength: uploadedSize }, pdfHeaders);
      throw new Error(`Unexpected ${request.method} ${request.url}`);
    });
    script.runQr(0);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_upload",
      "cv_attach",
      "cv_lookup",
      "cv_download",
    ]);
    expect(uploadedSize).toBe(cvSizeFor(1, 0));
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
    expect(script.counters.cv_upload_accepted).toBe(1);
    expect(script.counters.cv_upload_rate_limited_429).toBeUndefined();
  });

  test("reports expected upload 429s separately, not as failures", () => {
    const script = loadScript((request) =>
      request.url.endsWith("/api/storage/cv")
        ? respond(429, { error: "Too many requests" })
        : respond(200, { data: "t" })
    );
    script.runQr(0);
    const upload = script.requests.find(
      (r: Request) => r.params.tags?.name === "cv_upload"
    )!;
    expect(upload.params.responseCallback).toEqual([201, 429]);
    expect(script.counters.cv_upload_rate_limited_429).toBe(1);
    expect(script.counters.cv_upload_accepted).toBeUndefined();
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
    expect(script.requests).toHaveLength(2);
  });

  test("near-limit uploads send exactly 10 MiB and are counted", () => {
    const script = loadScript((request) => {
      if (request.url.endsWith("/api/storage/cv"))
        return respond(201, { id: "file-1" });
      if (request.url.endsWith("/cv/file"))
        return respond(200, { byteLength: CV_MAX_BYTES }, pdfHeaders);
      if (request.url.endsWith("/1250001/cv") && request.method === "GET")
        return respond(200, { url: "/api/students/1250001/cv/file" });
      return respond(200, { data: "t", ok: true });
    });
    script.vu.iterationInScenario = 3; // (1 + 3) % 5 selects the 10 MiB slot.
    script.runQr(0);
    const upload = script.requests.find(
      (r: Request) => r.params.tags?.name === "cv_upload"
    )!;
    expect(upload.params.tags?.size).toBe("near_limit");
    expect((upload.body as { file: { data: string } }).file.data.length).toBe(
      CV_MAX_BYTES
    );
    expect(script.counters.cv_upload_near_limit_accepted).toBe(1);
  });

  test("dashboard loads the page, history and downloads saved CVs", () => {
    const script = loadScript((request) => {
      if (request.url.endsWith("/dashboard"))
        return respond(200, "", { "Content-Type": "text/html; charset=utf-8" });
      if (request.url.endsWith("/api/companies/history"))
        return respond(200, [
          { student: { code: "1250001" } },
          { student: { code: "1250002" } },
          { student: { code: "1250003" } },
        ]);
      if (request.url.endsWith("/1250002/cv")) return respond(404);
      if (request.url.endsWith("/cv"))
        return respond(200, { url: "/api/students/x/cv/file" });
      return respond(200, { byteLength: 10 }, pdfHeaders);
    });
    script.runDashboard(0);
    const names = script.requests.map((r: Request) => r.params.tags?.name);
    expect(names).toEqual([
      "dashboard_page",
      "dashboard_history",
      "cv_lookup",
      "cv_download",
      "cv_lookup",
    ]);
    expect(script.counters.cv_download_unavailable_404).toBe(1);
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
  });

  test("dashboard flags a company without saved students", () => {
    const script = loadScript((request) =>
      request.url.endsWith("/dashboard")
        ? respond(200, "", { "Content-Type": "text/html" })
        : respond(200, [])
    );
    script.runDashboard(0);
    expect(
      script.checks.find((c: { name: string }) =>
        c.name.includes("saved students")
      )?.passed
    ).toBe(false);
  });

  test("check-in counts duplicate 409s separately and sends one code", () => {
    const script = loadScript(() => respond(409, { error: "already" }));
    script.runCheckIn(0);
    const [request] = script.requests;
    expect(request.url).toBe(
      "https://staging.example.org/api/sessions/session-1/check-ins"
    );
    expect(JSON.parse(request.body as string)).toEqual({ code: "1250101" });
    expect(request.params.responseCallback).toEqual([201, 409]);
    expect(script.counters.checkin_duplicate_409).toBe(1);
    expect(script.checks).toEqual([]);
  });

  test("check-in failures outside the session fail the check", () => {
    const script = loadScript(() => respond(400, { error: "outside" }));
    script.runCheckIn(0);
    expect(script.checks).toEqual([
      { name: "check-in returns 201", passed: false },
    ]);
  });

  test("check-in 201s are counted as created", () => {
    const script = loadScript(() => respond(201, { id: "check-in-1" }));
    script.runCheckIn(0);
    expect(script.counters.checkin_created).toBe(1);
    expect(script.counters.checkin_duplicate_409).toBeUndefined();
  });

  test("every VU sends only its own group's account", () => {
    const script = loadScript((request) => {
      if (request.url.endsWith("/dashboard"))
        return respond(200, "", { "Content-Type": "text/html" });
      if (request.url.endsWith("/api/storage/cv")) return respond(429);
      if (request.url.endsWith("/check-ins")) return respond(201);
      return respond(200, { data: "t" });
    });
    const cookiesByGroup: Record<string, Set<string>> = {};
    script.roles.forEach((role: { group: string }, slot: number) => {
      script.vu.idInTest = slot + 1;
      const before = script.requests.length;
      script.runHeavyUser();
      const sent = script.requests
        .slice(before)
        .map((r: Request) => r.params.headers?.Cookie);
      expect(new Set(sent).size).toBe(1);
      (cookiesByGroup[role.group] ??= new Set()).add(sent[0]!);
    });
    expect([...cookiesByGroup.dashboard].sort()).toEqual([
      "employee-0",
      "employee-1",
    ]);
    expect([...cookiesByGroup.qr].sort()).toEqual([
      "student-0",
      "student-1",
      "student-2",
    ]);
    expect([...cookiesByGroup.checkIn]).toEqual(["staff-0"]);
  });

  test.each([413, 500])(
    "an unexpected %i upload fails its check and is not attached",
    (status) => {
      const script = loadScript((request) =>
        request.url.endsWith("/api/storage/cv")
          ? respond(status, { error: "upload failed" })
          : respond(200, { data: "t" })
      );
      script.runQr(0);
      expect(
        script.checks.find((c: { name: string }) =>
          c.name.startsWith("CV upload")
        )?.passed
      ).toBe(false);
      expect(script.counters.cv_upload_accepted).toBeUndefined();
      expect(script.counters.cv_upload_rate_limited_429).toBeUndefined();
      expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
        "qr_pass",
        "cv_upload",
      ]);
    }
  );

  test("a failed attach skips the download", () => {
    const script = loadScript((request) => {
      if (request.url.endsWith("/api/storage/cv"))
        return respond(201, { id: "file-1" });
      if (request.method === "POST" && request.url.endsWith("/cv"))
        return respond(403, { error: "Forbidden" });
      return respond(200, { data: "t" });
    });
    script.runQr(0);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_upload",
      "cv_attach",
    ]);
    expect(
      script.checks.find((c: { name: string }) => c.name.includes("attaches"))
        ?.passed
    ).toBe(false);
  });

  test("a download that differs from the upload fails the check", () => {
    const script = loadScript((request) => {
      if (request.url.endsWith("/api/storage/cv"))
        return respond(201, { id: "file-1" });
      if (request.url.endsWith("/cv/file"))
        return respond(200, { byteLength: 1 }, pdfHeaders);
      if (request.url.endsWith("/1250001/cv") && request.method === "GET")
        return respond(200, { url: "/api/students/1250001/cv/file" });
      return respond(200, { data: "t", ok: true });
    });
    script.runQr(0);
    const lookup = script.requests.find(
      (r: Request) => r.params.tags?.name === "cv_lookup"
    )!;
    expect(lookup.params.responseCallback).toEqual([200, 404]);
    expect(
      script.checks.find((c: { name: string }) =>
        c.name.includes("CV just uploaded")
      )?.passed
    ).toBe(false);
  });

  test("ACTION_ID adds a fresh action QR scan by the student", () => {
    const script = loadScript(actionRoute(), { ACTION_ID: "action-1" });
    script.runQr(0);
    const scan = script.requests.find(
      (r: Request) => r.params.tags?.name === "action_scan"
    )!;
    expect(scan.method).toBe("POST");
    // The QR carries "action-<jwt>"; like the student app, post the bare JWT.
    expect(scan.url).toBe(
      "https://staging.example.org/api/actions/signed.qr.token"
    );
    expect(scan.params.headers?.Cookie).toBe("student-0");
    expect(scan.params.responseCallback).toEqual([200, 400]);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "action_qr",
      "action_scan",
      "cv_upload",
    ]);
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
  });

  test("each student scans the action once, on the first iteration", () => {
    const script = loadScript(actionRoute(), { ACTION_ID: "action-1" });
    for (let iteration = 0; iteration < 5; iteration++) {
      script.vu.iterationInScenario = iteration;
      script.runQr(0);
    }
    const names = script.requests.map((r: Request) => r.params.tags?.name);
    expect(names.filter((name: string) => name === "action_scan")).toHaveLength(
      1
    );
    expect(names.filter((name: string) => name === "action_qr")).toHaveLength(
      1
    );
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
  });

  test("a rerun finding the action already completed is counted, not failed", () => {
    const script = loadScript(actionRoute({ completed: ["student-0"] }), {
      ACTION_ID: "action-1",
    });
    script.runQr(0);
    expect(script.counters.action_scan_already_completed_400).toBe(1);
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
  });

  test("any other 400 from the action scan fails its check", () => {
    const script = loadScript(actionRoute({ scanError: "QR Code expirado." }), {
      ACTION_ID: "action-1",
    });
    script.runQr(0);
    expect(script.counters.action_scan_already_completed_400).toBeUndefined();
    expect(
      script.checks.find(
        (c: { name: string }) => c.name === "action QR scan completes"
      )?.passed
    ).toBe(false);
  });
});

// The action endpoints as the server answers them: the QR is "action-<jwt>",
// only the bare JWT verifies, and a second completion by the same student is
// refused with completeActionById's 400.
function actionRoute({
  completed = [] as string[],
  scanError = "",
}: { completed?: string[]; scanError?: string } = {}) {
  const done = new Set(completed);
  return (request: Request) => {
    const cookie = request.params.headers?.Cookie ?? "";
    if (request.url.endsWith("/api/actions/action-1"))
      return respond(200, { qrCode: "action-signed.qr.token" });
    if (request.method === "POST" && request.url.includes("/api/actions/")) {
      if (!request.url.endsWith("/api/actions/signed.qr.token"))
        return respond(400, { error: "Erro inesperado." });
      if (scanError) return respond(400, { error: scanError });
      if (done.has(cookie))
        return respond(400, { error: "Já completaste esta ação" });
      done.add(cookie);
      return respond(200, { message: "Action completed" });
    }
    if (request.url.endsWith("/api/storage/cv")) return respond(429);
    return respond(200, { data: "t" });
  };
}

// Evaluates count thresholds as k6 2.3.0 does: a metric that never received a
// sample counts as 0, so "count>0" fails when nothing succeeded (checked
// against the real k6 binary).
function failedCountThresholds(
  thresholds: Record<string, string[]>,
  counters: Record<string, number>
) {
  return Object.entries(thresholds)
    .filter(([metric, rules]) =>
      rules.some((rule) => {
        const match = /^count>(\d+)$/.exec(rule);
        return match !== null && !((counters[metric] ?? 0) > Number(match[1]));
      })
    )
    .map(([metric]) => metric)
    .sort();
}

// A staging stand-in: uploads are stored per student and downloads return
// what was attached; saved students who were not uploaded in the run already
// have a 4 KiB CV.
function stagingRoute({
  upload = 201,
  nearLimitUpload = upload,
  lookup = 200,
}: { upload?: number; nearLimitUpload?: number; lookup?: number } = {}) {
  const uploadedBySession = new Map<string, number>();
  const cvBytes = new Map<string, number>();
  return (request: Request) => {
    const cookie = request.params.headers?.Cookie ?? "";
    const cv = /\/api\/students\/([^/]+)\/cv(\/file)?$/.exec(request.url);
    if (request.url.endsWith("/dashboard"))
      return respond(200, "", { "Content-Type": "text/html" });
    if (request.url.endsWith("/api/companies/history"))
      return respond(200, [
        { student: { code: "1250001" } },
        { student: { code: "SAVED1" } },
      ]);
    if (request.url.endsWith("/api/qrcode")) return respond(200, { data: "t" });
    if (request.url.endsWith("/api/storage/cv")) {
      const bytes = (request.body as { file: { data: string } }).file.data
        .length;
      const status = bytes === CV_MAX_BYTES ? nearLimitUpload : upload;
      if (status !== 201) return respond(status, { error: "Too many" });
      uploadedBySession.set(cookie, bytes);
      return respond(201, { id: `file-${cookie}` });
    }
    if (cv && request.method === "POST") {
      cvBytes.set(cv[1], uploadedBySession.get(cookie) ?? 0);
      return respond(200, { ok: true });
    }
    if (cv && !cv[2])
      return lookup === 200
        ? respond(200, { url: `/api/students/${cv[1]}/cv/file` })
        : respond(lookup, { error: "CV not found" });
    if (cv)
      return respond(
        200,
        { byteLength: cvBytes.get(cv[1]) ?? 4096 },
        pdfHeaders
      );
    if (request.url.endsWith("/check-ins")) return respond(201, { id: "c" });
    throw new Error(`Unexpected ${request.method} ${request.url}`);
  };
}

// Runs every VU for five iterations, enough for each student to reach the
// 10 MiB slot of the size plan, then evaluates the workload thresholds.
function simulateRun(
  route: (request: Request) => Response,
  overrides: Record<string, string> = {}
) {
  const script = loadScript(route, overrides);
  script.roles.forEach((_: unknown, slot: number) => {
    script.vu.idInTest = slot + 1;
    for (let iteration = 0; iteration < 5; iteration++) {
      script.vu.iterationInScenario = iteration;
      script.runHeavyUser();
    }
  });
  return {
    ...script,
    failed: failedCountThresholds(script.options.thresholds, script.counters),
    allChecksPassed: script.checks.every((c: { passed: boolean }) => c.passed),
  };
}

const UPLOAD_REAL = "cv_upload_accepted{size:real}";
const UPLOAD_NEAR_LIMIT = "cv_upload_accepted{size:near_limit}";
const DOWNLOAD_REAL = "cv_download_succeeded{group:qr,size:real}";
const DOWNLOAD_NEAR_LIMIT = "cv_download_succeeded{group:qr,size:near_limit}";
const DOWNLOAD_DASHBOARD = "cv_download_succeeded{group:dashboard}";
// Both CV sizes, uploaded and downloaded back, sorted as the evaluator sorts.
const STUDENT_WORKLOAD = [
  DOWNLOAD_NEAR_LIMIT,
  DOWNLOAD_REAL,
  UPLOAD_NEAR_LIMIT,
  UPLOAD_REAL,
];

describe("required CV workload", () => {
  test("requires both CV sizes uploaded and downloaded, plus dashboard downloads", () => {
    const expected = Object.fromEntries(
      [...STUDENT_WORKLOAD, DOWNLOAD_DASHBOARD].map((metric) => [
        metric,
        ["count>0"],
      ])
    );
    expect(workloadThresholds(heavyUserPlan(env()))).toEqual(expected);
    expect(loadScript(() => respond(200)).options.thresholds).toMatchObject(
      expected
    );
  });

  test.each([
    ["QR group disabled", { QR_USERS: "0" }, [DOWNLOAD_DASHBOARD]],
    ["dashboard group disabled", { DASHBOARD_USERS: "0" }, STUDENT_WORKLOAD],
    [
      "dashboard downloads switched off",
      { DASHBOARD_DOWNLOADS_PER_VISIT: "0" },
      STUDENT_WORKLOAD,
    ],
    ["check-in only", { DASHBOARD_USERS: "0", QR_USERS: "0" }, []],
  ])("%s requires only the enabled workload", (_, overrides, metrics) => {
    expect(
      Object.keys(workloadThresholds(heavyUserPlan(env(overrides)))).sort()
    ).toEqual([...metrics].sort());
  });

  test("a run with real uploads and downloads meets every workload threshold", () => {
    const run = simulateRun(stagingRoute());
    expect(run.failed).toEqual([]);
    expect(run.allChecksPassed).toBe(true);
    // 3 students x 5 iterations: each size class is uploaded and read back.
    expect(run.counters[UPLOAD_NEAR_LIMIT]).toBe(3);
    expect(run.counters[UPLOAD_REAL]).toBe(12);
    expect(run.counters[DOWNLOAD_NEAR_LIMIT]).toBe(3);
    expect(run.counters[DOWNLOAD_REAL]).toBe(12);
  });

  test("a run where every upload gets 429 fails despite passing checks", () => {
    const run = simulateRun(stagingRoute({ upload: 429 }));
    // Before this guard, nothing else failed: 429 is an expected status.
    expect(run.allChecksPassed).toBe(true);
    expect(run.counters.cv_upload_rate_limited_429).toBe(15);
    expect(run.failed).toEqual(STUDENT_WORKLOAD);
  });

  test("a run where every CV lookup gets 404 fails despite passing checks", () => {
    const run = simulateRun(stagingRoute({ lookup: 404 }));
    expect(run.allChecksPassed).toBe(true);
    expect(run.counters.cv_download_unavailable_404).toBeGreaterThan(0);
    expect(run.failed).toEqual([
      DOWNLOAD_DASHBOARD,
      DOWNLOAD_NEAR_LIMIT,
      DOWNLOAD_REAL,
    ]);
  });

  test("a run where every upload gets 429 and every lookup gets 404 fails", () => {
    const run = simulateRun(stagingRoute({ upload: 429, lookup: 404 }));
    expect(run.allChecksPassed).toBe(true);
    expect(run.failed).toEqual([DOWNLOAD_DASHBOARD, ...STUDENT_WORKLOAD]);
  });

  test("a run where only the 10 MiB uploads get 429 fails on that size", () => {
    const run = simulateRun(stagingRoute({ nearLimitUpload: 429 }));
    expect(run.allChecksPassed).toBe(true);
    expect(run.counters[UPLOAD_REAL]).toBe(12);
    expect(run.failed).toEqual([DOWNLOAD_NEAR_LIMIT, UPLOAD_NEAR_LIMIT]);
  });

  test("a download of the wrong size is not counted as a success", () => {
    const route = stagingRoute();
    const run = simulateRun((request) =>
      request.url.endsWith("/cv/file") && request.url.includes("12500")
        ? respond(200, { byteLength: 1 }, pdfHeaders)
        : route(request)
    );
    expect(run.counters[DOWNLOAD_REAL]).toBeUndefined();
    expect(run.counters[DOWNLOAD_NEAR_LIMIT]).toBeUndefined();
    expect(run.failed).toEqual([DOWNLOAD_NEAR_LIMIT, DOWNLOAD_REAL]);
  });

  test("a check-in-only run needs no CV workload", () => {
    const run = simulateRun(stagingRoute({ upload: 429, lookup: 404 }), {
      DASHBOARD_USERS: "0",
      QR_USERS: "0",
    });
    expect(run.failed).toEqual([]);
    expect(run.counters.checkin_created).toBe(5);
  });
});
