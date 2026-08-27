import { expect, test } from "vitest";

import { createAdminFaqSchema } from "./adminFaqSchema";
import { createAdminInterestSchema } from "./adminInterestSchema";
import { createAdminScheduleSchema } from "./adminScheduleSchema";

const translated = { PT: "Português", EN: "English" };

test("dynamic-text admin writes require PT and EN", () => {
  expect(
    createAdminFaqSchema.safeParse({
      question: translated,
      answer: translated,
    }).success
  ).toBe(true);
  expect(
    createAdminInterestSchema.safeParse({ name: translated }).success
  ).toBe(true);
  expect(
    createAdminScheduleSchema.safeParse({
      day: 1,
      startTime: "09:00",
      endTime: "10:00",
      activity: translated,
    }).success
  ).toBe(true);

  expect(
    createAdminInterestSchema.safeParse({ name: { PT: "Português" } }).success
  ).toBe(false);
});
