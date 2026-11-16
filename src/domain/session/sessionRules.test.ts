import { assert, test } from "vitest";

import {
  eventDayIndex,
  getSessionWindow,
  isWithinSession,
  pickCurrentSession,
  sessionStatus,
} from "./sessionRules";

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

const START = "2026-11-17T08:30:00+00:00";
const DAYS = [17, 18];

test("eventDayIndex maps Lisbon dates to event days", () => {
  assert.equal(eventDayIndex(new Date("2026-11-17T00:30:00Z"), DAYS, START), 1);
  assert.equal(eventDayIndex(new Date("2026-11-18T23:59:00Z"), DAYS, START), 2);
  assert.equal(
    eventDayIndex(new Date("2026-11-16T12:00:00Z"), DAYS, START),
    null
  );
  assert.equal(
    eventDayIndex(new Date("2026-12-17T12:00:00Z"), DAYS, START),
    null
  );
});

test("eventDayIndex honours a non-UTC offset", () => {
  assert.equal(
    eventDayIndex(
      new Date("2026-11-16T23:30:00Z"),
      DAYS,
      "2026-11-17T08:30:00+01:00"
    ),
    1
  );
});

const w = (id: string, s: string, e: string) => ({
  id,
  start: new Date(`2026-11-17T${s}:00Z`),
  end: new Date(`2026-11-17T${e}:00Z`),
});
const at = (t: string) => new Date(`2026-11-17T${t}:00Z`);
const list = [
  w("open", "09:00", "09:30"),
  w("talk", "10:00", "11:00"),
  w("ws", "10:30", "12:00"),
  w("panel", "14:00", "15:00"),
];

test("pickCurrentSession prefers the running session that started last", () => {
  assert.equal(pickCurrentSession(list, at("10:15"))?.id, "talk");
  assert.equal(pickCurrentSession(list, at("10:45"))?.id, "ws");
});

test("pickCurrentSession falls back to the next upcoming, then the last", () => {
  assert.equal(pickCurrentSession(list, at("08:00"))?.id, "open");
  assert.equal(pickCurrentSession(list, at("12:30"))?.id, "panel");
  assert.equal(pickCurrentSession(list, at("16:00"))?.id, "panel");
  assert.equal(pickCurrentSession([], at("10:00")), null);
});

test("sessionStatus", () => {
  assert.equal(sessionStatus(list[1], at("10:00")), "running");
  assert.equal(sessionStatus(list[1], at("11:00")), "running");
  assert.equal(sessionStatus(list[1], at("09:59")), "upcoming");
  assert.equal(sessionStatus(list[1], at("11:01")), "ended");
});
