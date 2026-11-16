// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { afterAll, expect, test, vi } from "vitest";

import prisma from "@/application/repositories/database";

vi.mock("server-only", () => ({}));
const extras = JSON.parse(
  readFileSync("prisma/schema-extras.json", "utf8")
) as {
  indexes: string[];
  constraints: string[];
  functions: string[];
  triggers: string[];
  allowedDrift: string[];
};
afterAll(() => prisma.$disconnect());

test("SQL-owned cleanup objects survive migration replay and Prisma schema drift", async () => {
  const names = await prisma.$queryRaw<{ name: string }[]>`
    SELECT indexname AS name FROM pg_indexes WHERE schemaname = current_schema()
    UNION ALL SELECT conname FROM pg_constraint WHERE connamespace = current_schema()::regnamespace
    UNION ALL SELECT proname FROM pg_proc WHERE pronamespace = current_schema()::regnamespace
    UNION ALL SELECT tgname FROM pg_trigger JOIN pg_class ON tgrelid = pg_class.oid WHERE relnamespace = current_schema()::regnamespace AND NOT tgisinternal
  `;
  const actual = names.map(({ name }) => name);
  for (const name of [
    ...extras.indexes,
    ...extras.constraints,
    ...extras.functions,
    ...extras.triggers,
  ])
    expect(actual).toContain(name);
  const sql = execFileSync(
    "pnpm",
    [
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-schema-datasource",
      "prisma/schema.prisma",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8" }
  );
  const statements = sql
    .replace(/^--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => statement + ";");
  for (const statement of statements)
    expect(extras.allowedDrift).toContain(statement);
}, 30_000);
