// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

import { assertStagingTarget } from "../stagingTarget";
import { homepageAssets } from "./homepage";

const source = readFileSync(new URL("./capacity.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace(/export default /g, "")
  .replace(/export /g, "");

function load(workload = "heavy", status = 200, env = {}, vu = 1) {
  const requests: { path: string; name: string; responseType: string }[] = [];
  const samples: Record<string, unknown[]> = {};
  class Metric {
    name: string;
    constructor(name: string) {
      this.name = name;
      samples[name] = [];
    }
    add(value: unknown) {
      samples[this.name].push(value);
    }
  }
  const accounts = Array.from({ length: 600 }, (_, i) => ({
    code: `Q${String(i).padStart(5, "0")}`,
    studentCookie: `student-${i}`,
    employeeCookie: `employee-${i}`,
  }));
  const result = runInNewContext(`${source}\n({ runCapacity, options });`, {
    __ENV: {
      E2E_BASE_URL: "https://staging.example.org",
      STAGING_BASE_URL: "https://staging.example.org",
      CONFIRM_NON_PRODUCTION: "yes",
      CAPACITY_WORKLOAD: workload,
      VUS: "200",
      E2E_ALLOW_UPLOADS: "yes",
      ACTION_ID: "action",
      ...env,
    },
    __VU: vu,
    __ITER: 0,
    execution: { scenario: { iterationInTest: 0 } },
    SharedArray: class {
      constructor() {
        return accounts;
      }
    },
    Counter: Metric,
    Rate: Metric,
    Trend: Metric,
    assertStagingTarget,
    homepageAssets,
    open: (_path: string, mode?: string) =>
      mode ? new ArrayBuffer(5) : JSON.stringify(accounts),
    sleep() {},
    check(
      value: unknown,
      predicates: Record<string, (value: unknown) => boolean>
    ) {
      return Object.values(predicates).every((predicate) => predicate(value));
    },
    http: {
      file: (data: ArrayBuffer) => ({ data }),
      expectedStatuses() {},
      request(
        _method: string,
        path: string,
        _body: unknown,
        params: {
          tags: { name: string };
          responseCallback: unknown;
          responseType: string;
        }
      ) {
        requests.push({
          path,
          name: params.tags.name,
          responseType: params.responseType,
        });
        return {
          status:
            status === 200
              ? params.tags.name.startsWith("cv_upload") ||
                params.tags.name === "booth_scan"
                ? 201
                : params.tags.name === "session"
                  ? 401
                  : 200
              : status,
          headers: {},
          body: new ArrayBuffer(5),
          json: (key: string) =>
            key === "qrCode" ? "action-token" : "fixture",
          html: () => ({ find: () => ({ each() {} }) }),
        };
      },
      batch: () => [],
    },
  });
  return {
    runCapacity: result.runCapacity as () => void,
    options: result.options,
    samples,
    requests,
  };
}

test("target schedules 1,200 arrivals and fails dropped or incomplete visits", () => {
  const { options } = load("homepage-target");
  expect(options.scenarios.capacity).toMatchObject({
    executor: "constant-arrival-rate",
    rate: 20,
    duration: "60s",
  });
  expect(options.thresholds.completed_visits).toEqual(["count>=1200"]);
  expect(options.thresholds.dropped_iterations).toEqual(["count==0"]);
  expect(options.summaryTrendStats).toContain("p(99)");
  expect(options.maxRedirects).toBe(0);
  expect(options.systemTags).not.toContain("url");
});

test("heavy journey uploads, attaches, downloads, scans and checks in", () => {
  const { runCapacity, requests, samples } = load();
  runCapacity();
  expect(requests.map((r) => r.name)).toEqual([
    "dashboard",
    "student_profile",
    "student_qr",
    "booth_scan",
    "action_qr",
    "check_in",
    "cv_upload_small",
    "cv_attach",
    "cv_download_small",
    "student_history",
  ]);
  expect(requests.find((r) => r.name === "check_in")?.path).toBe(
    "https://staging.example.org/api/actions/token"
  );
  expect(
    requests.find((r) => r.name === "cv_download_small")?.responseType
  ).toBe("binary");
  expect(samples.capacity_errors).toEqual(Array(10).fill(false));
  expect(samples.booth_scans).toEqual([1]);
  expect(samples.action_check_ins).toEqual([1]);
  expect(load().options.thresholds.large_cvs_verified).toEqual(["count>0"]);
  const large = load("heavy", 200, {}, 10);
  large.runCapacity();
  expect(large.samples.large_cvs_verified).toEqual([1]);
});

test("429s are counted separately; unexpected HTTP failures stay errors", () => {
  const throttled = load("heavy", 429);
  throttled.runCapacity();
  expect(throttled.samples.capacity_429.length).toBeGreaterThan(0);
  expect(throttled.samples.capacity_errors).toEqual([]);
  const failed = load("heavy", 503);
  failed.runCapacity();
  expect(failed.samples.capacity_errors.every(Boolean)).toBe(true);
});

test("refuses production, missing upload opt-in and invalid load", () => {
  expect(() =>
    load("heavy", 200, {
      E2E_BASE_URL: "https://example.org",
      STAGING_BASE_URL: "https://example.org",
    })
  ).toThrow(/production/);
  expect(() => load("heavy", 200, { E2E_ALLOW_UPLOADS: "no" })).toThrow(
    /opt-in/
  );
  expect(() => load("heavy", 200, { VUS: "601" })).toThrow(/VUS/);
});
