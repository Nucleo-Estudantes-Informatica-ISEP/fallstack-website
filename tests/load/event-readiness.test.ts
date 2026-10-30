// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

import { assertStagingTarget } from "../stagingTarget";
import { hasSessionRole, homepageAssets, visitorCookie } from "./homepage";

// Run the real scenario with HTTP replaced, so coverage follows emitted request
// tags rather than a second list of endpoint names. k6 itself is not a Node module.
const source = readFileSync(
  new URL("./event-readiness.js", import.meta.url),
  "utf8"
)
  .replace(/^import .*;\n/gm, "")
  .replace("export const options", "const options")
  .replace("export default function", "function");

test.each(["", "session=synthetic"])(
  "every exercised homepage request has a latency gate (cookies: %s)",
  (cookies) => {
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
