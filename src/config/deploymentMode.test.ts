import { expect, test } from "vitest";

import { deploymentMode, futureEditionStart } from "./deploymentMode";

test("deployment selection is explicit and independent of dates", () => {
  for (const mode of ["OFF-SEASON", "PREPARATION", "EVENT"])
    expect(deploymentMode(mode)).toBe(mode);
  for (const mode of [undefined, "", "offseason", "automatic"])
    expect(() => deploymentMode(mode)).toThrow();
});
test("countdown requires a future timestamp with explicit timezone", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  for (const date of [
    undefined,
    "",
    "invalid",
    "2027-02-30T00:00:00Z",
    "2026-11-16T12:00:00Z",
    "2025-01-01T00:00:00Z",
    "2027-01-01T00:00:00",
  ])
    expect(futureEditionStart(date, now)).toBeNull();
  expect(futureEditionStart("2027-01-01T00:00:00.123Z", now)).toBe(
    Date.parse("2027-01-01T00:00:00.123Z")
  );
  expect(futureEditionStart("2027-01-01T00:00:00+00:00", now)).toBe(
    Date.parse("2027-01-01T00:00:00Z")
  );
});
