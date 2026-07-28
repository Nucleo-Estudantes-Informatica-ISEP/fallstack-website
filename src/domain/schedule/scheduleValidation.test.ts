import assert from "node:assert/strict";
import { test } from "vitest";

import { findInvalidScheduleRowIds } from "./scheduleValidation";

test("returns an empty set for a chronologically consistent sequence", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "09:00", endTime: "10:00" },
    { id: "b", startTime: "10:00", endTime: "11:00" },
    { id: "c", startTime: "11:00", endTime: "12:00" },
  ]);

  assert.equal(invalid.size, 0);
});

test("flags a row that starts before the previous row ends", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "10:30", endTime: "12:00" },
    { id: "b", startTime: "09:30", endTime: "10:00" },
  ]);

  assert.deepEqual([...invalid], ["b"]);
});

test("flags a row whose end isn't after its own start", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "10:00", endTime: "10:00" },
  ]);

  assert.deepEqual([...invalid], ["a"]);
});

test("flags a row whose end is before its own start", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "12:00", endTime: "09:00" },
  ]);

  assert.deepEqual([...invalid], ["a"]);
});

test("an empty sequence has no invalid rows", () => {
  assert.equal(findInvalidScheduleRowIds([]).size, 0);
});

test("a single valid row is fine on its own", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "09:00", endTime: "10:00" },
  ]);

  assert.equal(invalid.size, 0);
});

test("flags a row with a blank startTime, even as the first row of the day", () => {
  // A blank first row's startTime sorts before everything else, so it
  // never trips the "starts before the previous row ends" check (there is
  // no previous row) - must be caught on its own, not just via ordering.
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "", endTime: "10:00" },
    { id: "b", startTime: "10:00", endTime: "11:00" },
  ]);

  assert.deepEqual([...invalid], ["a"]);
});

test("flags a row with a blank endTime", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "09:00", endTime: "" },
  ]);

  assert.deepEqual([...invalid], ["a"]);
});

test("back-to-back rows (end equals next start) are valid, not an overlap", () => {
  const invalid = findInvalidScheduleRowIds([
    { id: "a", startTime: "09:00", endTime: "10:00" },
    { id: "b", startTime: "10:00", endTime: "10:30" },
  ]);

  assert.equal(invalid.size, 0);
});
