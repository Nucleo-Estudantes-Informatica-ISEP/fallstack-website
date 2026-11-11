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
