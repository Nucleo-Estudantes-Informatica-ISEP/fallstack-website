import { expect, test } from "vitest";

import {
  attendancePeriodsForDay,
  findAttendancePeriod,
} from "./attendancePeriods";
import { isWithinSession } from "./sessionRules";

test.each([1, 2])(
  "offers exactly morning and afternoon on event day %s",
  (day) => {
    const periods = attendancePeriodsForDay(day);
    expect(
      periods.map(({ id, startTime, endTime }) => ({ id, startTime, endTime }))
    ).toEqual([
      { id: `${day}-morning`, startTime: "09:00", endTime: "14:00" },
      { id: `${day}-afternoon`, startTime: "14:00", endTime: "18:00" },
    ]);
    expect(periods.map((p) => p.start.slice(0, 10))).toEqual([
      `2026-11-${16 + day}`,
      `2026-11-${16 + day}`,
    ]);
  }
);

test.each(["1-morning", "1-afternoon", "2-morning", "2-afternoon"])(
  "accepts exact boundaries and rejects times outside %s",
  (id) => {
    const p = findAttendancePeriod(id)!;
    const window = { start: new Date(p.start), end: new Date(p.end) };
    expect(isWithinSession(window.start, window)).toBe(true);
    expect(isWithinSession(window.end, window)).toBe(true);
    expect(isWithinSession(new Date(+window.start - 1), window)).toBe(false);
    expect(isWithinSession(new Date(+window.end + 1), window)).toBe(false);
    expect(isWithinSession(new Date("2026-11-17T14:00:00Z"), window)).toBe(
      false
    );
  }
);

test.each([
  "1-MORNING",
  "0-morning",
  "3-afternoon",
  "activity-uuid",
  "1-morning/anything",
])("rejects unknown period %s", (id) => {
  expect(findAttendancePeriod(id)).toBeUndefined();
});
