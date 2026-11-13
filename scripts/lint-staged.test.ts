// @vitest-environment node
import { execFileSync } from "node:child_process";
import { test } from "vitest";

test("the staged-file hook preserves base content and checks edits", () => {
  const env = { ...process.env };
  for (const key of execFileSync("git", ["rev-parse", "--local-env-vars"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n"))
    delete env[key];
  execFileSync(
    process.execPath,
    [
      "--test",
      "scripts/lint-staged.check.mjs",
      "scripts/lint-staged.integration.mjs",
    ],
    {
      stdio: "pipe",
      env,
    }
  );
}, 30000);
