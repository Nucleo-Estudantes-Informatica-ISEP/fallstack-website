import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const [kind, ...files] = process.argv.slice(2);
const base = process.env.LINT_STAGED_BASE || "origin/dev";
let changed;
try {
  changed = new Set(
    execFileSync("git", ["diff", "--cached", "--name-only", "-z", base, "--"], {
      encoding: "utf8",
    }).split("\0")
  );
} catch {
  console.error(
    `Cannot compare staged files with ${base}; set LINT_STAGED_BASE to the target base ref.`
  );
  process.exit(1);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const edited = files.filter((file) => changed.has(path.relative(root, file)));
const restored = files.filter(
  (file) => !changed.has(path.relative(root, file))
);

function run(command, args, targets) {
  if (!targets.length) return;
  const result = spawnSync("pnpm", ["exec", command, ...args, ...targets], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (restored.length) {
  console.log(
    `Preserving ${restored.length} staged file(s) matching ${base}; skipping auto-formatting.`
  );
  if (kind === "code") run("eslint", [], restored);
}
if (kind === "code") {
  run("prettier", ["--write"], edited);
  run("eslint", ["--fix"], edited);
} else if (kind === "format") {
  run("prettier", ["--write"], edited);
} else if (kind === "prisma") {
  for (const file of edited) run("prisma", ["format", "--schema"], [file]);
} else {
  throw new Error(`Unknown staged file type: ${kind}`);
}
