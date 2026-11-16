import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest", () => {
  it("uses dark theme_color and background_color to match branding", () => {
    const data = manifest();
    expect(data.theme_color).toBe("#141414");
    expect(data.background_color).toBe("#141414");
  });
});
