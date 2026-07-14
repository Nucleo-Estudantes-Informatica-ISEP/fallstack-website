import assert from "node:assert/strict";
import { test } from "vitest";

import { parseStudentYear, STUDENT_YEAR, studentYearLabel } from "./year";

test("studentYearLabel returns the display label for each key", () => {
  for (const key of Object.keys(
    STUDENT_YEAR
  ) as (keyof typeof STUDENT_YEAR)[]) {
    assert.equal(studentYearLabel(key), STUDENT_YEAR[key]);
  }
});

test("parseStudentYear round-trips every known label", () => {
  for (const key of Object.keys(
    STUDENT_YEAR
  ) as (keyof typeof STUDENT_YEAR)[]) {
    assert.equal(parseStudentYear(STUDENT_YEAR[key]), key);
  }
});

test("parseStudentYear rejects unknown labels", () => {
  assert.throws(
    () => parseStudentYear("4º Ano Doutoramento"),
    /Invalid student year/
  );
});
