import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("real lint-staged preserves restored and partially staged files", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "lint staged integration "));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = (name) => path.join(dir, name);
  const write = (name, content) => writeFileSync(file(name), content);
  const read = (name) => readFileSync(file(name), "utf8");
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trimEnd();
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    LINT_STAGED_BASE: "origin/dev",
  };
  const commitTree = (parent) =>
    execFileSync(
      "git",
      [
        "commit-tree",
        git("write-tree"),
        ...(parent ? ["-p", parent] : []),
        "-m",
        "fixture",
      ],
      { cwd: dir, env, encoding: "utf8" }
    ).trim();
  const run = () =>
    spawnSync("pnpm", ["exec", "lint-staged"], {
      cwd: dir,
      env,
      encoding: "utf8",
    });
  const staged = (name) =>
    execFileSync("git", ["show", `:${name}`], { cwd: dir, encoding: "utf8" });

  git("init", "-q");
  symlinkSync(path.join(root, "node_modules"), file("node_modules"));
  mkdirSync(file("scripts"));
  copyFileSync(
    path.join(root, "scripts/lint-staged.mjs"),
    file("scripts/lint-staged.mjs")
  );
  copyFileSync(path.join(root, ".lintstagedrc"), file(".lintstagedrc"));
  write("package.json", '{"private":true}\n');
  write(
    "eslint.config.mjs",
    'export default [{ files: ["**/*.js"], rules: { "no-undef": "error" } }];\n'
  );
  write(".gitignore", "node_modules\n");
  const restored =
    "export const restored={value:1};\n\n\n\nexport const tail = 0;\n";
  write("restored file.js", restored);
  write("ordinary.js", "export const value = 0;\n");
  write(
    "partial.js",
    "export const first = 0;\n\n\n\nexport const last = 0;\n"
  );
  write("restored.md", "# Base   \n");
  write("edited.md", "# Base\n");
  write("unrelated.txt", "base\n");
  write("restored-error.js", "missingBaseGlobal();\n");
  write("restored.prisma", "model Restored {\n id Int @id\n}\n");
  write("one.prisma", "model One {\n  id Int @id\n}\n");
  write("two.prisma", "model Two {\n  id Int @id\n}\n");
  git("add", ".");
  const base = commitTree();
  git("update-ref", "refs/remotes/origin/dev", base);
  write("restored file.js", "export const branch = true;\n");
  write("restored.md", "# Branch\n");
  write("restored-error.js", "export const branch = true;\n");
  write("restored.prisma", "model Branch {\n id Int @id\n}\n");
  git("add", ".");
  git("update-ref", "HEAD", commitTree(base));
  write("restored file.js", restored);
  write("restored.md", "# Base   \n");
  write("ordinary.js", "export const value={answer:42};\n");
  write(
    "partial.js",
    "export const first={answer:1};\n\n\n\nexport const last = 0;\n"
  );
  write("edited.md", "# Edited   \n");
  git(
    "add",
    "restored file.js",
    "restored.md",
    "ordinary.js",
    "partial.js",
    "edited.md"
  );
  write(
    "partial.js",
    "export const first={answer:1};\n\n\n\nexport const last = 99;\n"
  );
  write("restored file.js", restored.replace("tail = 0", "tail = 99"));
  write("unrelated.txt", "unstaged content\n");
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(staged("restored file.js"), restored);
  assert.equal(
    read("restored file.js"),
    restored.replace("tail = 0", "tail = 99")
  );
  assert.equal(staged("restored.md"), "# Base   \n");
  assert.equal(staged("ordinary.js"), "export const value = { answer: 42 };\n");
  assert.match(staged("partial.js"), /first = \{ answer: 1 \}/);
  assert.match(staged("partial.js"), /last = 0/);
  assert.match(read("partial.js"), /last = 99/);
  assert.equal(read("unrelated.txt"), "unstaged content\n");
  assert.equal(staged("edited.md"), "# Edited\n");

  write("ordinary.js", "missingGlobal();\n");
  git("add", "ordinary.js");
  const before = staged("ordinary.js");
  const failure = run();
  assert.notEqual(failure.status, 0, failure.stdout + failure.stderr);
  assert.match(failure.stdout + failure.stderr, /no-undef/);
  assert.equal(staged("ordinary.js"), before);
  assert.equal(read("unrelated.txt"), "unstaged content\n");
  assert.match(read("partial.js"), /last = 99/);

  write("ordinary.js", "export const value = 1;\n");
  git("add", "ordinary.js");
  write("restored-error.js", "missingBaseGlobal();\n");
  git("add", "restored-error.js");
  const restoredFailure = run();
  assert.notEqual(
    restoredFailure.status,
    0,
    restoredFailure.stdout + restoredFailure.stderr
  );
  assert.match(restoredFailure.stdout + restoredFailure.stderr, /no-undef/);
  assert.equal(staged("restored-error.js"), "missingBaseGlobal();\n");
  git("restore", "--staged", "restored-error.js");

  write("one.prisma", "model One {\n id Int @id\n name String\n}\n");
  write("two.prisma", "model Two {\n id Int @id\n name String\n}\n");
  write("restored.prisma", "model Restored {\n id Int @id\n}\n");
  git("add", "one.prisma", "two.prisma", "restored.prisma");
  const prisma = run();
  assert.equal(prisma.status, 0, prisma.stdout + prisma.stderr);
  assert.equal(staged("restored.prisma"), "model Restored {\n id Int @id\n}\n");
  assert.equal(
    staged("one.prisma"),
    "model One {\n  id   Int    @id\n  name String\n}\n"
  );
  assert.equal(
    staged("two.prisma"),
    "model Two {\n  id   Int    @id\n  name String\n}\n"
  );
});
