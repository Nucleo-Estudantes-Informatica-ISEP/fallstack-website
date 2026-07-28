import assert from "node:assert/strict";
import { test } from "vitest";

import { AuthPolicySession, passesAuthPolicy } from "./authPolicy";

const studentSession: AuthPolicySession = {
  role: "STUDENT",
  adminRole: null,
  student: { id: "student-1", code: "AB12" },
  employee: null,
};

test("public policy allows anonymous and logged-in requests", () => {
  assert.equal(passesAuthPolicy("public", null), true);
  assert.equal(passesAuthPolicy("public", studentSession), true);
});

test("session policy requires a session but no particular role", () => {
  assert.equal(passesAuthPolicy("session", null), false);
  assert.equal(passesAuthPolicy("session", studentSession), true);
});

test("student policy requires STUDENT role with a student profile", () => {
  assert.equal(passesAuthPolicy("student", studentSession), true);
  assert.equal(
    passesAuthPolicy("student", { ...studentSession, student: null }),
    false
  );
  assert.equal(
    passesAuthPolicy("student", { ...studentSession, role: "EMPLOYEE" }),
    false
  );
});

test("employee policy requires EMPLOYEE role with an employee's company", () => {
  const employeeSession: AuthPolicySession = {
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: { company: { id: "company-1" } },
  };
  assert.equal(passesAuthPolicy("employee", employeeSession), true);
  assert.equal(
    passesAuthPolicy("employee", { ...employeeSession, employee: null }),
    false
  );
  assert.equal(
    passesAuthPolicy("employee", {
      ...employeeSession,
      employee: { company: null },
    }),
    false
  );
});

test("admin policy accepts either admin tier", () => {
  assert.equal(
    passesAuthPolicy("admin", { ...studentSession, adminRole: "ADMIN" }),
    true
  );
  assert.equal(
    passesAuthPolicy("admin", {
      ...studentSession,
      adminRole: "SUPER_ADMIN",
    }),
    true
  );
  assert.equal(passesAuthPolicy("admin", studentSession), false);
});

test("superadmin policy requires SUPER_ADMIN specifically", () => {
  assert.equal(
    passesAuthPolicy("superadmin", {
      ...studentSession,
      adminRole: "SUPER_ADMIN",
    }),
    true
  );
  assert.equal(
    passesAuthPolicy("superadmin", { ...studentSession, adminRole: "ADMIN" }),
    false
  );
  assert.equal(passesAuthPolicy("superadmin", studentSession), false);
});

test("every non-public policy rejects a missing session", () => {
  for (const policy of [
    "session",
    "student",
    "employee",
    "admin",
    "superadmin",
  ] as const) {
    assert.equal(passesAuthPolicy(policy, null), false);
  }
});
