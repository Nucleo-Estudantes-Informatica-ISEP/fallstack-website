import { expect, test } from "vitest";

import { toStudentDto } from "./studentDto";

const student = {
  id: "s",
  code: "123",
  name: "Student",
  bio: null,
  year: "LICENCIATURA_3" as const,
  course: null,
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: null,
  user: { email: "student@example.test" },
};
test("legacy accounts with no recorded course or LinkedIn remain readable", () => {
  expect(toStudentDto(student)).toMatchObject({
    course: null,
    linkedin: null,
    year: "3º Ano Licenciatura",
  });
});
test("profile readback preserves independent course, year and LinkedIn", () => {
  expect(
    toStudentDto({
      ...student,
      course: "Engenharia Informática",
      linkedin: "https://linkedin.com/in/student",
    })
  ).toMatchObject({
    course: "Engenharia Informática",
    year: "3º Ano Licenciatura",
    linkedin: "https://linkedin.com/in/student",
  });
});
