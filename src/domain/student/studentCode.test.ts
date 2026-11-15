import { expect, test } from "vitest";

import { isStudentCode, normalizeStudentCode } from "./studentCode";

test("recognizes both four and six-character Fallstack student codes", () => {
  expect(isStudentCode("AB12")).toBe(true);
  expect(isStudentCode("AB12CD")).toBe(true);
  expect(isStudentCode(" ab12 ")).toBe(true);
  expect(isStudentCode(" ab12cd ")).toBe(true);
});

test("rejects student codes with invalid lengths or characters", () => {
  expect(isStudentCode("AB1")).toBe(false);
  expect(isStudentCode("AB123")).toBe(false);
  expect(isStudentCode("AB12345")).toBe(false);
  expect(isStudentCode("AB-12")).toBe(false);
  expect(isStudentCode("action-123")).toBe(false);
  expect(isStudentCode("eyJhbGciOiJIUzI1NiJ9.payload.signature")).toBe(false);
});

test("normalizes Wallet barcode values before server validation", () => {
  expect(normalizeStudentCode(" ab12 ")).toBe("AB12");
  expect(normalizeStudentCode(" ab12cd ")).toBe("AB12CD");
});
