// @vitest-environment node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "vitest";

const source = readFileSync(
  new URL("./failure-scenarios.js", import.meta.url),
  "utf8"
)
  .replace(/^import .*;\n/gm, "")
  .replace(/export default /g, "")
  .replace(/export /g, "");
function load(fault, seconds, status = null, requestSeconds = 0) {
  const requests = [];
  const checks = [];
  const checkTags = [];
  const instance = { currentTestRunDuration: seconds * 1000 };
  const result = vm.runInNewContext(
    `${source}\n({runFailure, phaseAt, options})`,
    {
      __ENV: { FAILURE_SCENARIO: fault },
      assertStagingTarget: () => "http://localhost",
      execution: { instance },
      sleep() {},
      check(res, predicates, tags) {
        checkTags.push(tags);
        checks.push(...Object.values(predicates).map((fn) => fn(res)));
      },
      http: {
        expectedStatuses: (value) => value,
        get(url, params) {
          requests.push({ url, ...params });
          const startedAt = instance.currentTestRunDuration / 1000;
          const responseStatus =
            typeof status === "function" ? status(url, startedAt) : status;
          instance.currentTestRunDuration += requestSeconds * 1000;
          return { status: responseStatus ?? params.responseCallback };
        },
      },
    }
  );
  result.runFailure();
  return { ...result, requests, checks, checkTags };
}
for (const fault of ["copy-removed", "copy-drained", "redis-unavailable"]) {
  test(`${fault}: baseline, outage and recovery requests`, () => {
    for (const seconds of [0, 60, 120]) {
      const result = load(fault, seconds);
      assert.equal(result.requests.length, 4);
      for (const request of result.requests) {
        const expected =
          fault === "redis-unavailable" &&
          seconds === 60 &&
          request.url.endsWith("/api/ready")
            ? 503
            : 200;
        assert.equal(request.responseCallback, expected);
      }
      assert.ok(result.checks.every(Boolean));
    }
  });
}
test("unexpected outage and missing recovery fail checks", () => {
  assert.ok(load("copy-drained", 60, 503).checks.every((value) => !value));
  assert.ok(
    load("redis-unavailable", 120, 503).checks.every((value) => !value)
  );
});
test("phase boundaries and required samples", () => {
  const { phaseAt, options } = load("copy-removed", 0);
  assert.deepEqual([29, 30, 45, 90, 105].map(phaseAt), [
    "baseline",
    "injection",
    "fault",
    "restoration",
    "recovery",
  ]);
  assert.equal(options.maxRedirects, 0);
  for (const phase of ["baseline", "fault", "recovery"])
    assert.equal(options.thresholds[`http_reqs{phase:${phase}}`][0], "count>0");
});
test("unknown scenario is rejected", () =>
  assert.throws(() => load("unknown", 0)));

for (const [seconds, phases] of [
  [29, ["baseline", "injection", "injection", "injection"]],
  [44, ["injection", "fault", "fault", "fault"]],
  [88, ["fault", "fault", "restoration", "restoration"]],
  [104, ["restoration", "recovery", "recovery", "recovery"]],
]) {
  test(`requests and checks use their own start phase at ${seconds}s`, () => {
    const result = load("copy-removed", seconds, 200, 1);
    assert.deepEqual(
      result.requests.map(({ tags }) => tags.phase),
      phases
    );
    assert.deepEqual(
      result.checkTags.map(({ phase }) => phase),
      phases
    );
    assert.ok(result.checks.every(Boolean));
  });
}
for (const [seconds, readyStatus, readyPhase] of [
  [86, 503, "fault"],
  [88, 200, "restoration"],
]) {
  test(`Redis readiness follows its request start time at ${seconds}s`, () => {
    const result = load(
      "redis-unavailable",
      seconds,
      (url, startedAt) =>
        url.endsWith("/api/ready") && startedAt >= 45 && startedAt < 90
          ? 503
          : 200,
      1
    );
    const ready = result.requests.find(({ url }) => url.endsWith("/api/ready"));
    assert.equal(ready.responseCallback, readyStatus);
    assert.equal(ready.tags.phase, readyPhase);
    assert.ok(result.checks.every(Boolean));
  });
}
