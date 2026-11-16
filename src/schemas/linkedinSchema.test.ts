import { expect, test } from "vitest";

import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";

import { isValidLinkedinUrl } from "./linkedinSchema";
import { patchStudentSchema } from "./patchStudentSchema";
import { postStudentSchema } from "./postStudentSchema";

const valid = [
  "https://www.linkedin.com/in/maria-silva",
  "https://www.linkedin.com/in/maria-silva/",
  "https://www.linkedin.com/in/joão_pereira2",
  "https://linkedin.com/in/maria",
  "https://pt.linkedin.com/in/maria-silva/",
];
const invalid = [
  "http://www.linkedin.com/in/maria",
  "https://www.linkedin.com/company/acme",
  "https://www.linkedin.com/in/",
  "https://www.linkedin.com/in/maria//x",
  "https://example.com/in/maria",
  "not a url",
];

test.each(valid)("accepts %s", (url) => {
  expect(isValidLinkedinUrl(url)).toBe(true);
});

test.each(invalid)("rejects %s", (url) => {
  expect(isValidLinkedinUrl(url)).toBe(false);
});

test("long non-matching input is rejected quickly (no catastrophic backtracking)", () => {
  const hostile = `https://www.linkedin.com/in/${"a".repeat(2000)}!`;
  const start = performance.now();
  expect(isValidLinkedinUrl(hostile)).toBe(false);
  expect(performance.now() - start).toBeLessThan(100);
});

test("signup and profile update schemas apply the same rule", () => {
  const signup = (linkedin: string) =>
    postStudentSchema.safeParse({
      name: "Student",
      course: "Engenharia Informática",
      privacyPolicyAccepted: true,
      termsAccepted: true,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      year: "1º Ano Licenciatura",
      interests: [],
      linkedin,
    }).success;
  const patch = (linkedin: string) =>
    patchStudentSchema.safeParse({ linkedin }).success;

  for (const url of [...valid, ...invalid])
    expect({ url, signup: signup(url), patch: patch(url) }).toEqual({
      url,
      signup: isValidLinkedinUrl(url),
      patch: isValidLinkedinUrl(url),
    });
  expect(patch("")).toBe(true);
});
