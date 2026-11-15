// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

test("runner selects one topology, runs canary first and keeps cookies out of argv", () => {
  const dir = mkdtempSync(join(tmpdir(), "capacity-runner-"));
  try {
    const binary = join(dir, "k6");
    const log = join(dir, "calls");
    writeFileSync(
      binary,
      '#!/bin/bash\nprintf "%s\\n" "$* rate=$TARGET_RATE cookie=$([[ -n $STUDENT_COOKIES ]] && echo present)" >> "$CALL_LOG"\nexit "${MOCK_EXIT:-0}"\n',
      { mode: 0o700 }
    );
    const env = {
      ...process.env,
      E2E_BASE_URL: "https://staging.example.org",
      STAGING_BASE_URL: "https://staging.example.org",
      CONFIRM_NON_PRODUCTION: "yes",
      CAPACITY_COPIES: "3",
      CAPACITY_CELLS: "3c-homepage-1200",
      CAPACITY_CANARY: "yes",
      CAPACITY_RESULT_DIR: dir,
      K6_BIN: binary,
      CALL_LOG: log,
      STUDENT_COOKIES: "session=private",
      TARGET_RATE: "7",
    };
    const run = (overrides = {}) =>
      spawnSync("bash", ["tests/load/capacity-targets.sh"], {
        env: { ...env, ...overrides },
        encoding: "utf8",
      });
    expect(run().status).toBe(0);
    const calls = readFileSync(log, "utf8").trim().split("\n");
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("canary-");
    expect(calls[0]).toContain("rate=2 cookie=present");
    expect(calls[1]).toContain("rate=7 cookie=present");
    expect(calls[1]).toContain("3c-homepage-1200.json");
    expect(calls.join()).not.toContain("private");
    expect(run({ CAPACITY_COPIES: "2" }).status).toBe(2);
    expect(readFileSync(log, "utf8").trim().split("\n")).toHaveLength(2);
    expect(run({ CAPACITY_CANARY: "typo" }).status).toBe(2);
    expect(
      run({ CAPACITY_CELLS: "3c-homepage-1200,3c-homepage-1200" }).status
    ).toBe(2);
    expect(
      run({ CAPACITY_CELLS: "3c-homepage-80", STUDENT_COOKIES: "" }).status
    ).not.toBe(0);
    writeFileSync(join(dir, "3c-homepage-1200.json"), "{}");
    expect(run().status).toBe(2);
    rmSync(join(dir, "3c-homepage-1200.json"));
    expect(readFileSync(log, "utf8").trim().split("\n")).toHaveLength(2);
    expect(run({ MOCK_EXIT: "9" }).status).toBe(9);
    expect(readFileSync(log, "utf8").trim().split("\n")).toHaveLength(3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.each([
  {
    count: 40,
    duplicate: false,
    cells: "3c-homepage-80,3c-homepage-160",
    expectedCalls: 0,
  },
  {
    count: 80,
    duplicate: false,
    cells: "3c-homepage-80,3c-homepage-200",
    expectedCalls: 0,
  },
  {
    count: 100,
    duplicate: true,
    cells: "3c-homepage-1200,3c-homepage-200",
    expectedCalls: 0,
  },
  {
    count: 2,
    duplicate: true,
    cells: "3c-homepage-1200,3c-heavy-200",
    expectedCalls: 0,
  },
  {
    count: 2,
    duplicate: true,
    cells: "3c-homepage-1200,3c-failure-boundary",
    expectedCalls: 0,
  },
  ...[
    { count: 200, interval: undefined, expectedCalls: 0 },
    { count: 200, interval: "12", expectedCalls: 3 },
    { count: 199, interval: "12", expectedCalls: 0 },
    { count: 100, interval: "24", expectedCalls: 3 },
    { count: 100, interval: "23.99", expectedCalls: 0 },
    ...["0", "-1", "NaN", "Infinity", "abc", "12seconds", " "].map(
      (interval) => ({ count: 200, interval, expectedCalls: 0 })
    ),
  ].map((entry) => ({
    ...entry,
    duplicate: false,
    cells: "3c-homepage-1200,3c-heavy-200",
  })),
  { count: 0, duplicate: false, cells: "3c-homepage-80", expectedCalls: 0 },
  {
    count: 100,
    duplicate: false,
    cells: "3c-homepage-80,3c-homepage-160,3c-homepage-200,3c-homepage-1200",
    expectedCalls: 5,
  },
  {
    count: 2,
    duplicate: false,
    cells: "3c-failure-boundary",
    expectedCalls: 2,
  },
])(
  "validates session pools before traffic: $cells ($count, duplicate=$duplicate)",
  ({ count, duplicate, cells, expectedCalls, ...settings }) => {
    const dir = mkdtempSync(join(tmpdir(), "capacity-sessions-"));
    try {
      const log = join(dir, "calls");
      const binary = join(dir, "k6");
      writeFileSync(
        binary,
        '#!/bin/bash\nprintf "%s\\n" "$*" >> "$CALL_LOG"\n',
        { mode: 0o700 }
      );
      const cookies = Array.from(
        { length: count },
        (_, i) => `session=synthetic-${i}`
      );
      if (duplicate) cookies[cookies.length - 1] = ` ${cookies[0]} `;
      const result = spawnSync("bash", ["tests/load/capacity-targets.sh"], {
        env: {
          ...process.env,
          E2E_BASE_URL: "https://staging.example.org",
          STAGING_BASE_URL: "https://staging.example.org",
          CONFIRM_NON_PRODUCTION: "yes",
          CAPACITY_COPIES: "3",
          CAPACITY_CELLS: cells,
          CAPACITY_CANARY: "yes",
          CAPACITY_RESULT_DIR: dir,
          K6_BIN: binary,
          CALL_LOG: log,
          STUDENT_COOKIES: ` , ${cookies.join(", ")}, , `,
          REQUEST_INTERVAL_SECONDS:
            "interval" in settings ? settings.interval : undefined,
        },
        encoding: "utf8",
      });
      expect(result.status).toBe(expectedCalls ? 0 : 2);
      const calls = existsSync(log)
        ? readFileSync(log, "utf8").trim().split("\n")
        : [];
      expect(calls).toHaveLength(expectedCalls);
      if (!expectedCalls)
        expect(result.stderr).toMatch(
          /STUDENT_COOKIES|REQUEST_INTERVAL_SECONDS/
        );
      if (cells === "3c-failure-boundary")
        expect(calls.at(-1)).toContain("VUS=2");
      expect(result.stderr).not.toContain("session=");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
);
