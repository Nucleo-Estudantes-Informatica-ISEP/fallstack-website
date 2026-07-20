import { describe, expect, it } from "vitest";

import generateRandomCode from "./GenerateCode";

describe("generateRandomCode", () => {
  it("returns a 4-character string", () => {
    const code = generateRandomCode();
    expect(code).toHaveLength(4);
  });

  it("only contains characters from A-Z0-9", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRandomCode();
      expect(code).toMatch(/^[A-Z0-9]{4}$/);
    }
  });

  it("produces varied output across repeated calls", () => {
    const codes = Array.from({ length: 50 }, () => generateRandomCode());
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThan(1);
  });
});
