import { expect, test } from "vitest";

import { institutionalEmailSchema } from "./institutionalEmailSchema";
import { patchStudentSchema } from "./patchStudentSchema";

test("validates and normalizes the institutional profile contact", () => {
  expect(institutionalEmailSchema.parse(" 1234567@ISEP.IPP.PT ")).toBe(
    "1234567@isep.ipp.pt"
  );
  for (const email of ["", "user@gmail.com", "x@isep.ipp.pt.evil.test"])
    expect(
      patchStudentSchema.safeParse({ institutionalEmail: email }).success
    ).toBe(false);
});
