// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";

import { validCvEnvelope } from "@/domain/cvUpload";
import {
  cvUploadIdSchema,
  directCvUploadSchema,
} from "@/schemas/directCvUploadSchema";

import {
  cachedPdfLayout,
  checkInCodeFor,
  CV_MAX_BYTES,
  CV_SIZE_PLAN,
  cvPdfBytes,
  cvPdfLayout,
  cvSizeFor,
  heavyUserPlan,
  isNearLimit,
  roleTable,
  workloadThresholds,
} from "./heavyUserPlan";
import { minioPost } from "./minioPost";

const STORAGE_ORIGIN = "https://storage.staging.example.org";

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
    CV_STORAGE_ORIGIN: STORAGE_ORIGIN,
    ...overrides,
  };
}

describe("CV fixture", () => {
  test.each(CV_SIZE_PLAN)("builds a valid PDF of exactly %i bytes", (size) => {
    const bytes = new Uint8Array(cvPdfBytes(size));
    const pdf = Buffer.from(bytes).toString("latin1");
    expect(bytes.byteLength).toBe(size);
    expect(pdf.startsWith("%PDF-1.7\n%synthetic CV synthetic CV ")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    const xref = Number(/startxref\n(\d+)\n/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) =>
      Number(match[1])
    );
    expect(offsets).toHaveLength(5);
    offsets.forEach((offset, index) =>
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true)
    );
    // The same envelope check the server runs when it finalizes an upload.
    expect(
      validCvEnvelope(bytes.subarray(0, 16), bytes.subarray(size - 1024))
    ).toBe(true);
  });

  test("lays out the PDF without building the padding as a string", () => {
    const { head, padding, tail } = cvPdfLayout(CV_MAX_BYTES);
    expect(head.length + padding + tail.length).toBe(CV_MAX_BYTES);
    expect(head.length + tail.length).toBeLessThan(1024);
  });

  test("memoizes the layout per size and renders identical bytes each time", () => {
    for (const size of CV_SIZE_PLAN)
      expect(cachedPdfLayout(size)).toBe(cachedPdfLayout(size));
    const first = cvPdfBytes(CV_MAX_BYTES);
    const second = cvPdfBytes(CV_MAX_BYTES);
    // Fresh buffers (no per-VU cache of 10 MiB bodies), same content.
    expect(second).not.toBe(first);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });

  test("rejects a size too small to hold the PDF structure", () => {
    expect(() => cvPdfLayout(100)).toThrow(/at least/);
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
    [{ CV_STORAGE_ORIGIN: "" }, /CV_STORAGE_ORIGIN/],
    [
      { CV_STORAGE_ORIGIN: "https://storage.staging.example.org/bucket" },
      /CV_STORAGE_ORIGIN/,
    ],
    [{ CV_STORAGE_ORIGIN: "ftp://storage.example.org" }, /CV_STORAGE_ORIGIN/],
  ])("rejects %o", (overrides, message) => {
    expect(() => heavyUserPlan(env(overrides))).toThrow(message);
  });

  test("pins the storage origin only when students upload", () => {
    expect(
      heavyUserPlan(env({ CV_STORAGE_ORIGIN: `${STORAGE_ORIGIN}/` })).qr
        .storageOrigin
    ).toBe(STORAGE_ORIGIN);
    expect(() =>
      heavyUserPlan(env({ QR_USERS: "0", CV_STORAGE_ORIGIN: "" }))
    ).not.toThrow();
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
  const sleeps: number[] = [];
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
      cvPdfBytes,
      cvSizeFor,
      minioPost,
      heavyUserPlan,
      isNearLimit,
      roleTable,
      workloadThresholds,
      exec: { vu },
      sleep: (seconds: number) => sleeps.push(seconds),
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
        expectedStatuses: (...statuses: number[]) => statuses,
        get: (url: string, params?: object) => send("GET", url, null, params),
        post: (url: string, body: unknown, params?: object) =>
          send("POST", url, body, params),
      },
    }
  );
  return { ...context, requests, checks, counters, sleeps, vu };
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

  test("student uploads directly to storage, then attaches and downloads the CV", () => {
    const route = stagingRoute();
    const script = loadScript(route);
    script.runQr(0);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_authorize",
      "cv_direct_transfer",
      "cv_finalize",
      "cv_attach",
      "cv_lookup",
      "cv_download",
    ]);
    expect(route.transfers[0].bytes.length).toBe(cvSizeFor(1, 0));
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
    expect(script.counters.cv_upload_accepted).toBe(1);
    expect(script.counters.cv_upload_rate_limited_429).toBeUndefined();
  });

  test("follows the direct upload contract at every step", () => {
    const route = stagingRoute();
    const script = loadScript(route);
    script.runQr(0);
    const step = (name: string) =>
      script.requests.find((r: Request) => r.params.tags?.name === name)!;
    // Authorize: JSON metadata only (the route validates it with the real
    // schema), with the student's session.
    expect(JSON.parse(step("cv_authorize").body as string)).toEqual({
      filename: "cv.pdf",
      contentType: "application/pdf",
      size: cvSizeFor(1, 0),
    });
    expect(step("cv_authorize").params.headers?.Cookie).toBe("student-0");
    // Transfer: to the signed URL, signed fields first and the file last, no
    // application cookie, with the server-valid PDF bytes.
    expect(step("cv_direct_transfer").url).toBe(
      `${STORAGE_ORIGIN}/fallstack-cvs`
    );
    expect(route.transfers[0].cookie).toBeUndefined();
    expect(route.transfers[0].fields).toEqual([
      "key",
      "Content-Type",
      "success_action_status",
      "Policy",
      "file",
    ]);
    expect(
      route.transfers[0].bytes.equals(Buffer.from(cvPdfBytes(cvSizeFor(1, 0))))
    ).toBe(true);
    // Finalize: the upload id from authorize, with the student's session.
    expect(JSON.parse(step("cv_finalize").body as string)).toEqual({
      uploadId: "00000000-0000-4000-8000-000000000000",
    });
    expect(step("cv_finalize").params.headers?.Cookie).toBe("student-0");
  });

  test("reports expected upload 429s separately, not as failures", () => {
    const script = loadScript(stagingRoute({ upload: 429 }));
    script.runQr(0);
    const authorize = script.requests.find(
      (r: Request) => r.params.tags?.name === "cv_authorize"
    )!;
    expect(authorize.params.responseCallback).toEqual([201, 429]);
    expect(script.counters.cv_upload_rate_limited_429).toBe(1);
    expect(script.counters.cv_upload_accepted).toBeUndefined();
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
    // Nothing is transferred, finalized or attached after a 429.
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_authorize",
    ]);
  });

  test("near-limit uploads transfer exactly 10 MiB and are counted", () => {
    const route = stagingRoute();
    const script = loadScript(route);
    script.vu.iterationInScenario = 3; // (1 + 3) % 5 selects the 10 MiB slot.
    script.runQr(0);
    for (const name of ["cv_authorize", "cv_direct_transfer", "cv_finalize"])
      expect(
        script.requests.find((r: Request) => r.params.tags?.name === name)
          .params.tags?.size
      ).toBe("near_limit");
    expect(route.transfers[0].bytes.length).toBe(CV_MAX_BYTES);
    expect(script.counters.cv_upload_near_limit_accepted).toBe(1);
    expect(
      script.counters["cv_download_succeeded{group:qr,size:near_limit}"]
    ).toBe(1);
  });

  test("never sends CV bytes to a storage origin other than CV_STORAGE_ORIGIN", () => {
    const route = stagingRoute({
      storageUrl: "https://storage.example.org/fallstack-cvs",
    });
    const script = loadScript(route);
    script.runQr(0);
    expect(route.transfers).toEqual([]);
    expect(
      script.checks.find((c: { name: string }) =>
        c.name.startsWith("CV upload authorized")
      )?.passed
    ).toBe(false);
    expect(script.counters.cv_upload_accepted).toBeUndefined();
  });

  test("a storage rejection fails the transfer check and skips finalize", () => {
    const script = loadScript(stagingRoute({ transfer: 403 }));
    script.runQr(0);
    expect(
      script.checks.find((c: { name: string }) => c.name.startsWith("storage"))
        ?.passed
    ).toBe(false);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_authorize",
      "cv_direct_transfer",
    ]);
  });

  test("finalize is retried while in progress, like the student app", () => {
    const script = loadScript(stagingRoute({ finalize: [409, 409] }));
    script.runQr(0);
    const finalizes = script.requests.filter(
      (r: Request) => r.params.tags?.name === "cv_finalize"
    );
    expect(finalizes).toHaveLength(3);
    expect(finalizes[0].params.responseCallback).toEqual([200, 409]);
    expect(script.counters.cv_upload_accepted).toBe(1);
    expect(script.checks.every((c: { passed: boolean }) => c.passed)).toBe(
      true
    );
  });

  test("a finalize that never succeeds fails its check and is not counted", () => {
    const script = loadScript(stagingRoute({ finalize: [409, 409, 409] }));
    script.runQr(0);
    expect(
      script.requests.filter(
        (r: Request) => r.params.tags?.name === "cv_finalize"
      )
    ).toHaveLength(3);
    expect(
      script.checks.find((c: { name: string }) =>
        c.name.startsWith("CV upload finalized")
      )?.passed
    ).toBe(false);
    expect(script.counters.cv_upload_accepted).toBeUndefined();
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

  test("every visit waits out its group's interval from the visit start", () => {
    const script = loadScript(stagingRoute());
    const waits: Record<string, number> = {};
    script.roles.forEach((role: { group: string }, slot: number) => {
      script.vu.idInTest = slot + 1;
      script.runHeavyUser();
      waits[role.group] = script.sleeps.at(-1);
    });
    // Visits against the stand-in take milliseconds, so each wait is close
    // to the whole interval: 10 s dashboard, 15 s QR, 3 s check-in.
    expect(waits.dashboard).toBeGreaterThan(9.5);
    expect(waits.dashboard).toBeLessThanOrEqual(10);
    expect(waits.qr).toBeGreaterThan(14.5);
    expect(waits.qr).toBeLessThanOrEqual(15);
    expect(waits.checkIn).toBeGreaterThan(2.5);
    expect(waits.checkIn).toBeLessThanOrEqual(3);
  });

  test("a script error still waits out the interval and fails a check", () => {
    const route = stagingRoute();
    const script = loadScript((request) => {
      if (request.url.startsWith(STORAGE_ORIGIN))
        throw new Error("connection reset");
      return route(request);
    });
    script.vu.idInTest =
      script.roles.findIndex((role: { group: string }) => role.group === "qr") +
      1;
    expect(() => script.runHeavyUser()).toThrow("connection reset");
    // Without the wait, the VU would loop at once and flood authorize.
    expect(script.sleeps.at(-1)).toBeGreaterThan(14.5);
    expect(script.checks).toContainEqual({
      name: "visit completes without a script error",
      passed: false,
    });
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

  // 415 is what the multipart upload now gets from the direct-upload route.
  test.each([415, 500])(
    "an unexpected %i authorization fails its check and sends no bytes",
    (status) => {
      const route = stagingRoute({ upload: status });
      const script = loadScript(route);
      script.runQr(0);
      expect(
        script.checks.find((c: { name: string }) =>
          c.name.startsWith("CV upload authorized")
        )?.passed
      ).toBe(false);
      expect(script.counters.cv_upload_accepted).toBeUndefined();
      expect(script.counters.cv_upload_rate_limited_429).toBeUndefined();
      expect(route.transfers).toEqual([]);
      expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
        "qr_pass",
        "cv_authorize",
      ]);
    }
  );

  test("a failed attach skips the download", () => {
    const route = stagingRoute();
    const script = loadScript((request) =>
      request.method === "POST" &&
      /\/api\/students\/[^/]+\/cv$/.test(request.url)
        ? respond(403, { error: "Forbidden" })
        : route(request)
    );
    script.runQr(0);
    expect(script.requests.map((r: Request) => r.params.tags?.name)).toEqual([
      "qr_pass",
      "cv_authorize",
      "cv_direct_transfer",
      "cv_finalize",
      "cv_attach",
    ]);
    expect(
      script.checks.find((c: { name: string }) => c.name.includes("attaches"))
        ?.passed
    ).toBe(false);
  });

  test("a download that differs from the upload fails the check", () => {
    const route = stagingRoute();
    const script = loadScript((request) =>
      request.url.endsWith("/cv/file")
        ? respond(200, { byteLength: 1 }, pdfHeaders)
        : route(request)
    );
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
      "cv_authorize",
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

// Splits the S3 POST form the script sends to storage into its ordered parts.
function parseStorageForm(body: unknown, contentType = "") {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
  if (!boundary) throw new Error("Storage transfer is not multipart");
  const text = Buffer.from(body as ArrayBuffer).toString("latin1");
  return text
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => {
      const split = part.indexOf("\r\n\r\n");
      return {
        name: /name="([^"]+)"/.exec(part.slice(0, split))![1],
        value: Buffer.from(part.slice(split + 4, -2), "latin1"),
      };
    });
}

interface StagingOptions {
  upload?: number;
  nearLimitUpload?: number;
  storageUrl?: string;
  transfer?: number;
  finalize?: number[];
  lookup?: number;
}

// A staging stand-in for the direct upload contract (#595). Authorize returns
// a signed storage form; storage keeps the bytes; finalize validates them like
// the server and returns the CV id; downloads return what was attached. Saved
// students who did not upload in the run already have a 4 KiB CV. `finalize`
// lists the statuses returned on successive attempts before the 200.
function stagingRoute({
  upload = 201,
  nearLimitUpload = upload,
  storageUrl = `${STORAGE_ORIGIN}/fallstack-cvs`,
  transfer = 204,
  finalize = [],
  lookup = 200,
}: StagingOptions = {}) {
  const tickets = new Map<string, { cookie: string; size: number }>();
  const stored = new Map<string, Buffer>();
  const finalizeCalls = new Map<string, number>();
  const cvSizes = new Map<string, number>();
  const cvBytes = new Map<string, number>();
  const transfers: {
    cookie?: string;
    fields: string[];
    bytes: Buffer;
  }[] = [];
  const route = (request: Request) => {
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
      // The real request schema: a JSON body the server would otherwise 415.
      expect(request.params.headers?.["Content-Type"]).toBe("application/json");
      const body = directCvUploadSchema.parse(
        JSON.parse(request.body as string)
      );
      const status = body.size === CV_MAX_BYTES ? nearLimitUpload : upload;
      if (status !== 201) return respond(status, { error: "Too many" });
      const uploadId = `00000000-0000-4000-8000-${String(tickets.size).padStart(12, "0")}`;
      tickets.set(uploadId, { cookie, size: body.size });
      return respond(201, {
        uploadId,
        url: storageUrl,
        fields: {
          key: `quarantine/cv/${uploadId}`,
          "Content-Type": "application/pdf",
          success_action_status: "204",
          Policy: "signed-policy",
        },
      });
    }
    if (request.url.startsWith(storageUrl)) {
      const parts = parseStorageForm(
        request.body,
        request.params.headers?.["Content-Type"]
      );
      transfers.push({
        cookie: request.params.headers?.Cookie,
        fields: parts.map((part) => part.name),
        bytes: parts.at(-1)!.value,
      });
      if (transfer !== 204) return respond(transfer, "<Error/>");
      const key = parts.find((part) => part.name === "key")!.value.toString();
      stored.set(key.replace("quarantine/cv/", ""), parts.at(-1)!.value);
      return respond(204, "");
    }
    if (request.url.endsWith("/api/storage/cv/finalize")) {
      const { uploadId } = cvUploadIdSchema.parse(
        JSON.parse(request.body as string)
      );
      const attempt = finalizeCalls.get(uploadId) ?? 0;
      finalizeCalls.set(uploadId, attempt + 1);
      if (attempt < finalize.length)
        return respond(finalize[attempt], { error: "In progress" });
      const ticket = tickets.get(uploadId);
      const bytes = stored.get(uploadId);
      if (!ticket || ticket.cookie !== cookie)
        return respond(404, { error: "Upload not found" });
      if (
        !bytes ||
        bytes.length !== ticket.size ||
        !validCvEnvelope(
          bytes.subarray(0, 16),
          bytes.subarray(bytes.length - 1024)
        )
      )
        return respond(400, { error: "Invalid or truncated PDF" });
      const id = `cv-${uploadId}`;
      cvSizes.set(id, bytes.length);
      return respond(200, { id });
    }
    if (cv && request.method === "POST") {
      const { id } = JSON.parse(request.body as string);
      cvBytes.set(cv[1], cvSizes.get(id) ?? 0);
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
  return Object.assign(route, { transfers });
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
