import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "vitest";

import { toCompanyDto } from "./dto/companyDto";
import { toAdminScanDto, toSavedStudentDto } from "./dto/historyDto";
import { toInterestDto } from "./dto/interestDto";
import { toSessionDto } from "./dto/sessionDto";

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
  const clientOnlyFiles = [join(sourceRoot, "lib", "http", "client.ts")];
  const serverFolders = [
    join(sourceRoot, "application", "repositories"),
    join(sourceRoot, "application", "services"),
    join(sourceRoot, "lib", "http"),
  ];
  for (const folder of serverFolders) {
    for (const file of await filesIn(folder)) {
      if (/\.test\.tsx?$/.test(file) || clientOnlyFiles.includes(file))
        continue;
      assert.match(await readFile(file, "utf8"), /import "server-only";/, file);
    }
  }
  for (const file of [
    ...(await filesIn(join(sourceRoot, "client"))),
    ...clientOnlyFiles,
  ]) {
    if (/\.test\.tsx?$/.test(file)) continue;
    assert.match(await readFile(file, "utf8"), /import "client-only";/, file);
  }
});

test("Client Components use response DTOs instead of Prisma entities", async () => {
  const files = (await filesIn(sourceRoot)).filter((file) =>
    /\.tsx?$/.test(file)
  );
  const violations: string[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (
      /^(["'])use client\1;/.test(source) &&
      /from ["']@prisma\/client["']/.test(source)
    )
      violations.push(relative(sourceRoot, file));
  }
  assert.deepEqual(violations, []);
});

test("public DTO mappers omit private database fields", () => {
  const company = {
    id: "company-id",
    name: "Example",
    tier: "GOLD" as const,
    avatar: null,
    code: "private-code",
    updatedAt: new Date(),
  };
  const session = {
    id: "user-id",
    email: "private@example.com",
    role: "STUDENT" as const,
    adminRole: "ADMIN" as const,
    updatedAt: new Date(),
    student: { id: "user-id", code: "ABC123", name: "Student" },
  };

  assert.deepEqual(toCompanyDto(company), {
    id: "company-id",
    name: "Example",
    tier: "GOLD",
    avatar: null,
  });
  assert.deepEqual(toSessionDto(session), {
    role: "STUDENT",
    adminRole: "ADMIN",
    student: { code: "ABC123", name: "Student" },
  });
  assert.deepEqual(toInterestDto({ id: "interest-id", name: "TypeScript" }), {
    id: "interest-id",
    name: "TypeScript",
  });
});

test("history DTO mappers preserve ids and serialize dates", () => {
  const createdAt = new Date("2026-07-13T12:00:00.000Z");
  const student = { code: "ABC123", name: "Student" };

  assert.equal(
    toSavedStudentDto({
      studentId: "student-id",
      createdAt,
      comment: null,
      student,
      savedBy: { name: "Employee" },
    }).createdAt,
    createdAt.toISOString()
  );
  assert.deepEqual(
    toAdminScanDto({
      id: "repository-id",
      studentId: "student-id",
      createdAt,
      student: {
        name: student.name,
        user: { email: "student@example.com" },
      },
    }),
    {
      id: "repository-id",
      studentId: "student-id",
      createdAt: createdAt.toISOString(),
      student: {
        name: student.name,
        user: { email: "student@example.com" },
      },
    }
  );
});
