import { expect, test } from "vitest";

import { isStudentCode, normalizeStudentCode } from "./studentCode";

test("recognizes the four-character Fallstack student code format", () => {
  expect(isStudentCode("AB12")).toBe(true);
  expect(isStudentCode(" ab12 ")).toBe(true);
  expect(isStudentCode("action-123")).toBe(false);
  expect(isStudentCode("eyJhbGciOiJIUzI1NiJ9.payload.signature")).toBe(false);
});

test("normalizes Wallet barcode values before server validation", () => {
  expect(normalizeStudentCode(" ab12 ")).toBe("AB12");
});
