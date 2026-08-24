import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("interest deletion cascades only through student join rows", async () => {
  const migration = await readFile(
    "prisma/migrations/20260822230505_move_interests_to_student/migration.sql",
    "utf8"
  );

  expect(migration).toMatch(
    /"_InterestToStudent_A_fkey"[\s\S]*FOREIGN KEY \("A"\) REFERENCES "Interest"\("id"\)[\s\S]*ON DELETE CASCADE/
  );

  expect(migration).toMatch(
    /"_InterestToStudent_B_fkey"[\s\S]*FOREIGN KEY \("B"\) REFERENCES "Student"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
});

test("interest deletion cascades only through company join rows", async () => {
  const migration = await readFile(
    "prisma/migrations/20260809100000_add_company_profile_and_rank/migration.sql",
    "utf8"
  );

  expect(migration).toMatch(
    /"_CompanyToInterest_A_fkey"[\s\S]*FOREIGN KEY \("A"\) REFERENCES "Company"\("id"\)[\s\S]*ON DELETE CASCADE/
  );

  expect(migration).toMatch(
    /"_CompanyToInterest_B_fkey"[\s\S]*FOREIGN KEY \("B"\) REFERENCES "Interest"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
});
