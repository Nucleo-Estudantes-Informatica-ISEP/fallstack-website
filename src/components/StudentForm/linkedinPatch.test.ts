import { expect, test } from "vitest";

import { linkedinPatch } from "./linkedinPatch";

test("omits an unchanged legacy value", () => {
  expect(
    linkedinPatch(
      "https://linkedin.com/in/example",
      "https://linkedin.com/in/example"
    )
  ).toEqual({});
});

test("omits an unchanged empty value", () => {
  expect(linkedinPatch("", null)).toEqual({});
  expect(linkedinPatch("", "")).toEqual({});
});

test("sends a changed value for validation", () => {
  expect(
    linkedinPatch(
      "https://www.linkedin.com/in/new",
      "https://linkedin.com/in/old"
    )
  ).toEqual({ linkedin: "https://www.linkedin.com/in/new" });
});

test("clears the value with null", () => {
  expect(linkedinPatch("", "https://linkedin.com/in/old")).toEqual({
    linkedin: null,
  });
});
