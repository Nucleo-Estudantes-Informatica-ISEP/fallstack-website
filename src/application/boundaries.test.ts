import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

const sourceRoot = join(process.cwd(), "src");

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesIn(path) : [path];
      })
    )
  ).flat();
}

test("Prisma runtime access stays inside repositories", async () => {
  const files = (await filesIn(sourceRoot)).filter((file) =>
    /\.tsx?$/.test(file)
  );
  const violations: string[] = [];
  for (const file of files) {
    if (
      file.includes("/application/repositories/") ||
      file.endsWith(".test.ts")
    )
      continue;
    const source = await readFile(file, "utf8");
    if (/\bprisma\.|new PrismaClient\b/.test(source))
      violations.push(relative(sourceRoot, file));
  }
  assert.deepEqual(violations, []);
});

test("server and client modules declare their boundary", async () => {
  for (const folder of ["repositories", "services"]) {
    for (const file of await filesIn(join(sourceRoot, "application", folder))) {
      assert.match(await readFile(file, "utf8"), /import "server-only";/, file);
    }
  }
  for (const file of await filesIn(join(sourceRoot, "client")))
    assert.match(await readFile(file, "utf8"), /import "client-only";/, file);
});
