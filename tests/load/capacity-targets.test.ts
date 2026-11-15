// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
