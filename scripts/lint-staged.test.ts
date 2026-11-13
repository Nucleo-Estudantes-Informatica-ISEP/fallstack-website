// @vitest-environment node
import { execFileSync } from "node:child_process";
import { test } from "vitest";

test("the staged-file hook preserves base content and checks edits", () => {
  execFileSync(
    process.execPath,
    [
      "--test",
      "scripts/lint-staged.check.mjs",
      "scripts/lint-staged.integration.mjs",
    ],
    {
      stdio: "pipe",
    }
  );
}, 30000);
