import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./lint-staged.mjs", import.meta.url));

test("preserves staged base content while fixing ordinary edits", (t) => {
  const dir = mkdtempSync(path.join(process.cwd(), ".lint-staged-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  const file = (name) => path.join(dir, name);
  const write = (name, content) => writeFileSync(file(name), content);
  git("init", "-q");
  write("restored file.tsx", 'className="bg-[#B1440A]"\n');
  write("edited.ts", "base\n");
  write("restored.md", "base markdown\n");
  write("edited.md", "base markdown\n");
  git("add", ".");
  const tree = git("write-tree");
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
  const commit = execFileSync("git", ["commit-tree", tree, "-m", "base"], {
    cwd: dir,
    env,
    encoding: "utf8",
  }).trim();
  git("update-ref", "refs/remotes/origin/dev", commit);
  write("restored file.tsx", "branch version\n");
  write("restored.md", "branch markdown\n");
  git("add", ".");
  const branchTree = git("write-tree");
  const branchCommit = execFileSync(
    "git",
    ["commit-tree", branchTree, "-p", commit, "-m", "branch"],
    { cwd: dir, env, encoding: "utf8" }
  ).trim();
  git("update-ref", "HEAD", branchCommit);
  write("restored file.tsx", 'className="bg-[#B1440A]"\n');
  write("edited.ts", "ordinary edit\n");
  write("restored.md", "base markdown\n");
  write("edited.md", "ordinary markdown\n");
  git("add", ".");

  mkdirSync(file("bin"));
  write(
    "bin/pnpm",
    `#!${process.execPath}\nconst fs = require("node:fs");\nconst args = process.argv.slice(2);\nfs.appendFileSync(process.env.TEST_LOG, JSON.stringify(args) + "\\n");\nif (process.env.TEST_FAIL) process.exit(7);\nif (args.includes("--write") || args.includes("--fix")) for (const f of args.filter(a => a.startsWith(process.env.TEST_DIR))) fs.appendFileSync(f, "fixed\\n");\n`
  );
  execFileSync("chmod", ["+x", file("bin/pnpm")]);
  const run = (base) =>
    spawnSync(
      process.execPath,
      [script, "code", file("restored file.tsx"), file("edited.ts")],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${file("bin")}:${process.env.PATH}`,
          TEST_LOG: file("calls"),
          TEST_DIR: dir,
          LINT_STAGED_BASE: base,
        },
      }
    );
  const result = run("origin/dev");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Preserving 1 staged file/);
  assert.equal(
    readFileSync(file("restored file.tsx"), "utf8"),
    'className="bg-[#B1440A]"\n'
  );
  assert.equal(git("show", ":restored file.tsx"), 'className="bg-[#B1440A]"');
  assert.equal(
    readFileSync(file("edited.ts"), "utf8"),
    "ordinary edit\nfixed\nfixed\n"
  );
  const calls = readFileSync(file("calls"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(calls, [
    ["exec", "eslint", file("restored file.tsx")],
    ["exec", "prettier", "--write", file("edited.ts")],
    ["exec", "eslint", "--fix", file("edited.ts")],
  ]);
  const format = spawnSync(
    process.execPath,
    [script, "format", file("restored.md"), file("edited.md")],
    {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${file("bin")}:${process.env.PATH}`,
        TEST_LOG: file("calls"),
        TEST_DIR: dir,
      },
    }
  );
  assert.equal(format.status, 0, format.stderr);
  assert.equal(readFileSync(file("restored.md"), "utf8"), "base markdown\n");
  assert.equal(
    readFileSync(file("edited.md"), "utf8"),
    "ordinary markdown\nfixed\n"
  );
  const failedLint = spawnSync(
    process.execPath,
    [script, "code", file("restored file.tsx")],
    {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${file("bin")}:${process.env.PATH}`,
        TEST_LOG: file("calls"),
        TEST_DIR: dir,
        TEST_FAIL: "1",
      },
    }
  );
  assert.equal(failedLint.status, 7);
  const missing = run("missing-base");
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Cannot compare staged files/);
  assert.equal(
    readFileSync(file("calls"), "utf8").trim().split("\n").length,
    5
  );
});
