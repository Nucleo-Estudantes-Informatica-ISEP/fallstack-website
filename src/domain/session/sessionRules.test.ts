import { assert, test } from "vitest";

import { getSessionWindow, isWithinSession } from "./sessionRules";

const event = { day: 1, startTime: "10:00", endTime: "11:00" };

test("builds the session window from the edition day and schedule times", () => {
  const window = getSessionWindow(event, [17, 18], "2026-11-17T08:30:00+00:00");

  assert.ok(window);
  assert.equal(window.start.toISOString(), "2026-11-17T10:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-11-17T11:00:00.000Z");
});

test("accepts check-in through the end of the session only", () => {
  const window = getSessionWindow(event, [17, 18], "2026-11-17T08:30:00+00:00");
  assert.ok(window);

  assert.equal(
    isWithinSession(new Date("2026-11-17T09:59:59.999Z"), window),
    false
  );
  assert.equal(
    isWithinSession(new Date("2026-11-17T10:00:00.000Z"), window),
    true
  );
  assert.equal(
    isWithinSession(new Date("2026-11-17T11:00:00.000Z"), window),
    true
  );
  assert.equal(
    isWithinSession(new Date("2026-11-17T11:00:00.001Z"), window),
    false
  );
});

test.each([
  ["2026-01-01T00:30:00+01:00", 1, "2026-01-01T09:00:00.000Z"],
  ["2026-12-31T23:30:00-01:00", 31, "2026-12-31T11:00:00.000Z"],
])("uses the offset-local month/year for %s", (start, day, expected) => {
  const window = getSessionWindow(event, [day], start);
  assert.equal(window?.start.toISOString(), expected);
});
