import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("student account deletion cascades action completions", async () => {
  const [schema, migration] = await Promise.all([
    readFile("prisma/schema.prisma", "utf8"),
    readFile(
      "prisma/migrations/20260811000000_cascade_action_completions_on_student_delete/migration.sql",
      "utf8"
    ),
  ]);

  expect(schema).toMatch(
    /student Student @relation\(fields: \[studentId\], references: \[id\], onDelete: Cascade\)/
  );
  expect(migration).toMatch(
    /"ActionCompletion_studentId_fkey"[\s\S]*ON DELETE CASCADE ON UPDATE CASCADE/
  );
});
