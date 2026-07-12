import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSavedStudentsCsv,
  savedStudentCommentData,
  savedStudentCompanyWhere,
} from "./savedStudentComments";

test("add, edit, and remove preserve intended comment values", () => {
  assert.deepEqual(savedStudentCommentData("Initial note"), {
    comment: "Initial note",
  });
  assert.deepEqual(savedStudentCommentData("Updated note"), {
    comment: "Updated note",
  });
  assert.deepEqual(savedStudentCommentData(null), { comment: null });
});

test("comment updates are scoped to the logged-in company", () => {
  assert.deepEqual(savedStudentCompanyWhere("student-id", "company-id"), {
    studentId: "student-id",
    savedBy: { companyId: "company-id" },
  });
});

test("CSV includes saved students without relying on CV availability", () => {
  const csv = buildSavedStudentsCsv([
    {
      comment: "No CV, still exported",
      student: { name: "Ana", code: "123" },
    },
    {
      comment: '=HYPERLINK("https://example.com")',
      student: { name: 'Bob "B"', code: "456" },
    },
  ]);

  assert.equal(csv.split("\n").length, 3);
  assert.match(csv, /No CV, still exported/);
  assert.match(csv, /Bob ""B""/);
  assert.match(csv, /'=HYPERLINK/);
});
