import { expect, test } from "vitest";

import { updateAdminStudentSchema } from "./adminStudentSchema";
import { patchStudentSchema } from "./patchStudentSchema";
import { postStudentSchema } from "./postStudentSchema";

test("student creation accepts an absolute LinkedIn URL and rejects relative URLs", () => {
  const validProfile = {
    name: "Student",
    year: "3º Ano Licenciatura",
    interests: [],
    linkedin: "https://www.linkedin.com/in/example",
  };

  expect(postStudentSchema.safeParse(validProfile).success).toBe(true);
  expect(
    postStudentSchema.safeParse({
      ...validProfile,
      linkedin: "linkedin.com/in/example",
    }).success
  ).toBe(false);
  expect(
    postStudentSchema.safeParse({ ...validProfile, linkedin: null }).success
  ).toBe(true);
});

test("student profile and admin updates reject relative LinkedIn URLs", () => {
  expect(
    patchStudentSchema.safeParse({
      linkedin: "linkedin.com/in/example",
    }).success
  ).toBe(false);
  expect(
    updateAdminStudentSchema.safeParse({
      linkedin: "linkedin.com/in/example",
    }).success
  ).toBe(false);
});

test.each([
  "javascript:alert(1)",
  "https://evil.example/in/x",
  "http://www.linkedin.com/in/x",
  "https://www.linkedin.com/company/acme",
])("LinkedIn schemas reject %s", (linkedin) => {
  expect(patchStudentSchema.safeParse({ linkedin }).success).toBe(false);
  expect(updateAdminStudentSchema.safeParse({ linkedin }).success).toBe(false);
  expect(
    postStudentSchema.safeParse({
      name: "Student",
      year: "3º Ano Licenciatura",
      interests: [],
      linkedin,
    }).success
  ).toBe(false);
});

test("clearing LinkedIn with an empty string is accepted on update", () => {
  expect(patchStudentSchema.safeParse({ linkedin: "" }).success).toBe(true);
  expect(patchStudentSchema.safeParse({ bio: "x", linkedin: "" }).success).toBe(
    true
  );
  expect(updateAdminStudentSchema.safeParse({ linkedin: "" }).success).toBe(
    true
  );
  expect(updateAdminStudentSchema.safeParse({ linkedin: null }).success).toBe(
    true
  );
});
