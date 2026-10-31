// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

import { assertStagingTarget } from "../stagingTarget";
import { hasSessionRole, homepageAssets, visitorCookie } from "./homepage";

// Run the real scenario with HTTP replaced, so coverage follows emitted request
// tags rather than a second list of endpoint names. k6 itself is not a Node module.
const scenarioSource = readFileSync(
  new URL("./event-readiness.js", import.meta.url),
  "utf8"
);

function nodeSource(source: string) {
  return source
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export const options", "const options")
    .replace("export default function", "function");
}

test.each([
  { cookies: "", ending: "LF" },
  { cookies: "session=synthetic", ending: "LF" },
  { cookies: "", ending: "CRLF" },
  { cookies: "session=synthetic", ending: "CRLF" },
])(
  "every exercised homepage request has a latency gate ($ending, cookies: $cookies)",
  ({ cookies, ending }) => {
    const source = nodeSource(
      scenarioSource.replace(/\r?\n/g, ending === "CRLF" ? "\r\n" : "\n")
    );
    const names = new Set<string>();
    const context = {
      __ENV: {
        E2E_BASE_URL: "https://staging.example.org",
        STAGING_BASE_URL: "https://staging.example.org",
        CONFIRM_NON_PRODUCTION: "yes",
        K6_SCENARIO: "homepage",
        STUDENT_COOKIES: cookies,
      },
      __ITER: 0,
      __VU: 1,
      assertStagingTarget,
      hasSessionRole,
      homepageAssets,
      visitorCookie,
      Trend: class {},
      sleep: () => {},
      check: () => true,
      http: {
        file: () => null,
        expectedStatuses: () => null,
        get: (_url: string, params: { tags: { name: string } }) => {
          names.add(params.tags.name);
          return {
            html: () => ({ find: () => ({ each: () => {} }) }),
          };
        },
        batch: (requests: { params: { tags: { name: string } } }[]) => {
          for (const request of requests) names.add(request.params.tags.name);
          return [];
        },
      },
    };
    const { options, runScenario } = runInNewContext(
      `${source}\n({ options, runScenario });`,
      context
    );
    runScenario();
    context.__ITER = 1;
    runScenario();

    for (const name of names)
      expect(options.thresholds[`http_req_duration{name:${name}}`]).toEqual([
        "p(95)<750",
      ]);
    const hasAuthGate = Object.hasOwn(
      options.thresholds,
      "http_req_duration{name:session_authenticated}"
    );
    expect(hasAuthGate).toBe(Boolean(cookies));
  }
);

// Evaluate init configuration to prove invalid pools fail before any HTTP call.
test.each([
  { vus: 4, cookies: "session=one", error: /at least/ },
  { vus: 5, cookies: "session=one,session=two", error: /at least/ },
  { vus: 4, cookies: "session=one,session=one", error: /distinct/ },
])(
  "peak rejects an insufficient or duplicate pool: $vus VUs",
  ({ vus, cookies, error }) => {
    expect(() =>
      runInNewContext(nodeSource(scenarioSource), {
        __ENV: {
          E2E_BASE_URL: "https://staging.example.org",
          STAGING_BASE_URL: "https://staging.example.org",
          CONFIRM_NON_PRODUCTION: "yes",
          K6_SCENARIO: "homepage",
          K6_PROFILE: "peak",
          VUS: String(vus),
          STUDENT_COOKIES: cookies,
        },
        assertStagingTarget,
        homepageAssets,
      })
    ).toThrow(error);
  }
);

test.each([4, 5, 50])(
  "peak accepts sufficient distinct sessions for %i VUs",
  (vus) => {
    const cookies = Array.from(
      { length: Math.ceil(vus / 2) },
      (_, i) => `session=${i}`
    );
    expect(() =>
      runInNewContext(nodeSource(scenarioSource), {
        __ENV: {
          E2E_BASE_URL: "https://staging.example.org",
          STAGING_BASE_URL: "https://staging.example.org",
          CONFIRM_NON_PRODUCTION: "yes",
          K6_SCENARIO: "homepage",
          K6_PROFILE: "peak",
          VUS: String(vus),
          STUDENT_COOKIES: cookies.join(","),
        },
        assertStagingTarget,
        homepageAssets,
        Trend: class {},
        http: { file: () => null },
      })
    ).not.toThrow();
    const assigned = Array.from({ length: vus }, (_, i) =>
      visitorCookie(i + 1, cookies)
    ).filter(Boolean);
    expect(new Set(assigned).size).toBe(Math.floor(vus / 2));
  }
);
