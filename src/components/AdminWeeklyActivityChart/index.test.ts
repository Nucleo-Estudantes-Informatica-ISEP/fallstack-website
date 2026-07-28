import { expect, test } from "vitest";

import { roundedTopBarPath } from ".";

test("returns null for a zero-height bar instead of a degenerate path", () => {
  expect(roundedTopBarPath(0, 0, 10, 0)).toBeNull();
});

test("returns null for a negative height", () => {
  expect(roundedTopBarPath(0, 0, 10, -5)).toBeNull();
});

test("draws a rounded-top bar anchored to the chart's baseline", () => {
  expect(roundedTopBarPath(24, 0, 10, 60)).toBe(
    "M24,120 V63 Q24,60 27,60 H31 Q34,60 34,63 V120 Z"
  );
});

test("clamps the corner radius for a bar shorter than the radius", () => {
  expect(roundedTopBarPath(0, 0, 10, 0.5)).toBe(
    "M0,120 V120 Q0,119.5 0.5,119.5 H9.5 Q10,119.5 10,120 V120 Z"
  );
});

test("clamps the corner radius for a bar narrower than the radius", () => {
  expect(roundedTopBarPath(0, 0, 2, 50)).toBe(
    "M0,120 V71 Q0,70 1,70 H1 Q2,70 2,71 V120 Z"
  );
});

test("handles a bar filling the full chart height", () => {
  expect(roundedTopBarPath(0, 0, 10, 112)).toBe(
    "M0,120 V11 Q0,8 3,8 H7 Q10,8 10,11 V120 Z"
  );
});
