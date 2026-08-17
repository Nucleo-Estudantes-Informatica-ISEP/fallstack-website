import { describe, expect, test } from "vitest";

import { isActionQrTimestampFresh } from "./actionRules";

describe("isActionQrTimestampFresh", () => {
  const now = 100_000;
  const refreshRateMs = 15_000;

  test("accepts timestamps within two refresh windows", () => {
    expect(isActionQrTimestampFresh(now - 30_000, now, refreshRateMs)).toBe(
      true
    );
  });

  test("rejects timestamps older than two refresh windows", () => {
    expect(isActionQrTimestampFresh(now - 30_001, now, refreshRateMs)).toBe(
      false
    );
  });

  test("rejects future timestamps", () => {
    expect(isActionQrTimestampFresh(now + 1, now, refreshRateMs)).toBe(false);
  });
});
