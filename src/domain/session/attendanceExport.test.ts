import { expect, test } from "vitest";

import { attendanceExportRow } from "./attendanceExport";

const row = {
  checkedInAt: new Date("2026-11-17T10:05:00Z"),
  student: { name: "Student", user: { email: "1234567@isep.ipp.pt" } },
  day: 1,
  period: "MORNING" as const,
};
test("exports one check-in with institutional number and session validity", () => {
  expect(
    attendanceExportRow(row, [17, 18], "2026-11-17T08:30:00+00:00")
  ).toEqual({
    Name: "Student",
    Email: "1234567@isep.ipp.pt",
    "Student number": "1234567",
    Date: "2026-11-17",
    Period: "Manhã",
    "Check-in time": "2026-11-17T10:05:00.000Z",
    "Valid until": "2026-11-17T12:00:00.000Z",
  });
});
test("does not invent student numbers for staff", () => {
  expect(
    attendanceExportRow(
      {
        ...row,
        student: { name: "Staff", user: { email: "abc@isep.ipp.pt" } },
      },
      [17, 18],
      "2026-11-17T08:30:00Z"
    )["Student number"]
  ).toBe("");
});
test("rejects invalid session days", () => {
  expect(() => attendanceExportRow(row, [], "2026-11-17T08:30:00Z")).toThrow();
});
