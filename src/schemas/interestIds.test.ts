import { expect, test } from "vitest";

import { patchStudentSchema } from "./patchStudentSchema";
import { postStudentSchema } from "./postStudentSchema";
import { userInterestsSchema } from "./userInterestsSchema";

const interestId = "00000000-0000-4000-8000-000000000001";

test("interest writes accept ids and reject display names", () => {
  expect(
    userInterestsSchema.safeParse({ interests: [interestId] }).success
  ).toBe(true);
  expect(
    patchStudentSchema.safeParse({ interests: [interestId] }).success
  ).toBe(true);
  expect(
    postStudentSchema.safeParse({
      name: "Student",
      year: "3º Ano Licenciatura",
      interests: [interestId],
    }).success
  ).toBe(true);

  expect(userInterestsSchema.safeParse({ interests: ["AI"] }).success).toBe(
    false
  );
});
