import assert from "node:assert/strict";
import { test } from "vitest";

import { actionCompletionUpsertArgs } from "./domain/actionRules";
import { assertStudentCanBeSaved } from "./domain/saveRules";
import { isAllowedToViewStudent } from "./domain/studentAccess";

test("action completion upsert is keyed on the compound unique index", () => {
  assert.deepEqual(actionCompletionUpsertArgs("student-id", "action-id"), {
    where: {
      actionId_studentId: { studentId: "student-id", actionId: "action-id" },
    },
    update: {},
    create: { studentId: "student-id", actionId: "action-id" },
  });
});

test("save rules reject duplicates unless explicitly allowed", () => {
  assert.throws(
    () => assertStudentCanBeSaved(true),
    (error: { message?: string; status?: number }) =>
      error.message === "Student already saved by your company" &&
      error.status === 409
  );
  assert.doesNotThrow(() => assertStudentCanBeSaved(true, true));
  assert.doesNotThrow(() => assertStudentCanBeSaved(false));
});

test("student access uses one owner/admin/saving-company policy", async () => {
  const unexpectedLookup = async () => {
    throw new Error("save lookup should be short-circuited");
  };
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { studentCode: "student-1", isAdmin: false },
      unexpectedLookup
    ),
    true
  );
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { isAdmin: true },
      unexpectedLookup
    ),
    true
  );
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { companyId: "company-1", isAdmin: false },
      async (companyId, code) =>
        companyId === "company-1" && code === "student-1"
    ),
    true
  );
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { companyId: "company-2", isAdmin: false },
      async () => false
    ),
    false
  );
});

test("student access skips the isSaved lookup when the caller already knows the result", async () => {
  const unexpectedLookup = async () => {
    throw new Error("save lookup should be short-circuited");
  };
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { companyId: "company-1", isAdmin: false, isSaved: true },
      unexpectedLookup
    ),
    true
  );
  assert.equal(
    await isAllowedToViewStudent(
      "student-1",
      { companyId: "company-1", isAdmin: false, isSaved: false },
      unexpectedLookup
    ),
    false
  );
});
