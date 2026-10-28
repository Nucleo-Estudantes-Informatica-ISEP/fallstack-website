import { expect, test } from "vitest";

import { branding } from "./branding";

test("Wallet validity dates agree with the Lisbon edition display", () => {
  const { event } = branding;
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  expect(start.getTime()).toBeLessThan(end.getTime());
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: "Europe/Lisbon",
      ...options,
    }).format(date);
  expect(
    [start, end].map((date) => Number(format(date, { day: "numeric" })))
  ).toEqual(event.days);
  for (const date of [start, end]) {
    expect(Number(format(date, { year: "numeric" }))).toBe(branding.year);
    expect(format(date, { month: "long" })).toBe(event.month);
  }
  const time = (date: Date) =>
    format(date, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).replace(/^0/u, "") + "h";
  expect(time(start)).toBe(event.beginningTime);
  expect(time(end)).toBe(event.endTime);
});
