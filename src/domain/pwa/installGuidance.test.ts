import { describe, expect, test } from "vitest";

import { getInstallGuidance } from "./installGuidance";

describe("getInstallGuidance", () => {
  const iosGuidance =
    "No iPhone ou iPad, toca em Partilhar e escolhe “Adicionar ao ecrã principal”.";

  test.each([
    {
      name: "iPhone browser",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      expected: iosGuidance,
    },
    {
      name: "iPad browser",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
      platform: "iPad",
      maxTouchPoints: 5,
      standalone: false,
      expected: iosGuidance,
    },
    {
      name: "iPadOS desktop user agent",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 5,
      standalone: false,
      expected: iosGuidance,
    },
    {
      name: "desktop Mac without touch",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 0,
      standalone: false,
      expected: null,
    },
    {
      name: "Android browser",
      userAgent: "Mozilla/5.0 (Linux; Android 16) Chrome/123",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
      standalone: false,
      expected: null,
    },
    {
      name: "standalone iPhone app",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: true,
      expected: null,
    },
  ])(
    "returns the appropriate guidance for $name",
    ({ expected, ...context }) => {
      expect(getInstallGuidance(context)).toBe(expected);
    }
  );
});
