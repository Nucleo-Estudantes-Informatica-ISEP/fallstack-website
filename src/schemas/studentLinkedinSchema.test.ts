import { expect, test } from "vitest";

import { updateAdminStudentSchema } from "./adminStudentSchema";
import { patchStudentSchema } from "./patchStudentSchema";
import { postStudentSchema } from "./postStudentSchema";

test("student creation accepts an absolute LinkedIn URL and rejects relative URLs", () => {
  const validProfile = {
    name: "Student",
    course: "Engenharia Informática",
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
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
  "https://linkedin.com/in/example",
  "https://linkedin.com/in/example/",
  "https://ca.linkedin.com/in/example",
  "https://pt.linkedin.com/in/example/",
  "https://www.linkedin.com/in/jo%C3%A3o-silva",
])("LinkedIn schemas accept %s", (linkedin) => {
  expect(patchStudentSchema.safeParse({ linkedin }).success).toBe(true);
  expect(updateAdminStudentSchema.safeParse({ linkedin }).success).toBe(true);
  expect(
    postStudentSchema.safeParse({
      name: "Student",
      course: "Engenharia Informática",
      privacyPolicyAccepted: true,
      termsAccepted: true,
      privacyPolicyVersion: "2026-10-31",
      termsVersion: "2026-11-11",
      year: "3º Ano Licenciatura",
      interests: [],
      linkedin,
    }).success
  ).toBe(true);
});

test.each([
  "javascript:alert(1)",
  "https://evil.linkedin.com.example/in/x",
  "https://abc.linkedin.com/in/x",
  "https://evil.example/in/x",
  "http://www.linkedin.com/in/x",
  "https://www.linkedin.com/company/acme",
])("LinkedIn schemas reject %s", (linkedin) => {
  expect(patchStudentSchema.safeParse({ linkedin }).success).toBe(false);
  expect(updateAdminStudentSchema.safeParse({ linkedin }).success).toBe(false);
  expect(
    postStudentSchema.safeParse({
      name: "Student",
      course: "Engenharia Informática",
      privacyPolicyAccepted: true,
      termsAccepted: true,
      privacyPolicyVersion: "2026-10-31",
      termsVersion: "2026-11-11",
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
