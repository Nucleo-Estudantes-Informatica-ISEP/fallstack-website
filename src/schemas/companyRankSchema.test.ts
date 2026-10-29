import { describe, expect, it } from "vitest";

import {
  createAdminCompanyRankSchema,
  updateAdminCompanyRankSchema,
} from "@/schemas/companyRankSchema";

it.each([true, false])(
  "preserves Destaque=%s on create and update",
  (isFeatured) => {
    const style = {
      gradientFromColor: "#fff",
      gradientFromStop: "0%",
      gradientToColor: "#fff",
      gradientToStop: "100%",
      isFeatured,
    };
    expect(
      createAdminCompanyRankSchema.parse({ name: "Main", style }).style
    ).toHaveProperty("isFeatured", isFeatured);
    expect(
      updateAdminCompanyRankSchema.parse({ style: { isFeatured } }).style
    ).toEqual({ isFeatured });
  }
);

it("rejects non-boolean Destaque values", () => {
  expect(
    updateAdminCompanyRankSchema.safeParse({ style: { isFeatured: "true" } })
      .success
  ).toBe(false);
});

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
