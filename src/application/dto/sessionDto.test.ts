import { expect, test } from "vitest";

import { toSessionDto } from "./sessionDto";

test("exposes only whether the user holds the nei-member grant", () => {
  expect(
    toSessionDto({
      role: null,
      adminRole: null,
      student: null,
      neiMember: true,
      attendanceExpiresAt: 123,
    } as never)
  ).toEqual({ role: null, adminRole: null, student: null, neiMember: true });
});

test("defaults neiMember to false when the grant is absent", () => {
  expect(
    toSessionDto({ role: "STUDENT", adminRole: null, student: null }).neiMember
  ).toBe(false);
});
