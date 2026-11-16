import { expect, test } from "vitest";

import {
  resolveAccountDestination,
  type AccountDestinationSession,
} from "./accountDestination";

const session = (
  overrides: Partial<AccountDestinationSession>
): AccountDestinationSession => ({
  role: null,
  adminRole: null,
  student: null,
  ...overrides,
});

test("guests are sent to registration", () => {
  expect(resolveAccountDestination(null)).toEqual({
    kind: "guest",
    href: "/signup",
  });
});

test("students with a profile go straight to their own dashboard", () => {
  expect(
    resolveAccountDestination(
      session({ role: "STUDENT", student: { code: "AB12" } })
    )
  ).toEqual({ kind: "student", href: "/student/AB12" });
});

test("students who have not finished onboarding resume the signup wizard", () => {
  expect(resolveAccountDestination(session({ role: "STUDENT" }))).toEqual({
    kind: "onboarding",
    href: "/signup",
  });
});

test("employees go to the company dashboard", () => {
  expect(resolveAccountDestination(session({ role: "EMPLOYEE" }))).toEqual({
    kind: "employee",
    href: "/dashboard",
  });
});

test.each(["ADMIN", "SUPER_ADMIN"] as const)(
  "%s accounts go to the admin area, even with another role",
  (adminRole) => {
    expect(
      resolveAccountDestination(
        session({ adminRole, role: "EMPLOYEE", student: { code: "AB12" } })
      )
    ).toEqual({ kind: "admin", href: "/overview" });
  }
);

test("an account without a usable role has no destination", () => {
  // getServerSession() downgrades an EMPLOYEE without the AuthNEI employee
  // grant to role null. /signup would redirect it straight back home, so a
  // call to action pointing there would only bounce the visitor around.
  expect(resolveAccountDestination(session({}))).toEqual({
    kind: "unresolved",
    href: null,
  });
});
