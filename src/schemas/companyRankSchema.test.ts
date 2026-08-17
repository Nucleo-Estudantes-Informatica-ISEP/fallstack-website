import { describe, expect, it } from "vitest";

import { updateAdminCompanyRankSchema } from "@/schemas/companyRankSchema";

describe("updateAdminCompanyRankSchema", () => {
  it("accepts a name-only update", () => {
    expect(
      updateAdminCompanyRankSchema.safeParse({ name: "Diamond" }).success
    ).toBe(true);
  });

  it("accepts a style with at least one field", () => {
    expect(
      updateAdminCompanyRankSchema.safeParse({
        style: { gradientFromColor: "#fff" },
      }).success
    ).toBe(true);
  });

  it("rejects an empty style object", () => {
    expect(updateAdminCompanyRankSchema.safeParse({ style: {} }).success).toBe(
      false
    );
  });

  it("rejects a body with no fields", () => {
    expect(updateAdminCompanyRankSchema.safeParse({}).success).toBe(false);
  });
});
