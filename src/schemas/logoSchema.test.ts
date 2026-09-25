import { describe, expect, it } from "vitest";

import { logoSchema } from "./logoSchema";

describe("logoSchema", () => {
  it("accepts static and application media paths", () => {
    expect(
      logoSchema.safeParse("/assets/images/sponsors/redbull.png").success
    ).toBe(true);
    expect(
      logoSchema.safeParse(
        "/api/media/avatar/00000000-0000-0000-0000-000000000000"
      ).success
    ).toBe(true);
    expect(
      logoSchema.safeParse(
        "/api/media/logo/00000000-0000-0000-0000-000000000000"
      ).success
    ).toBe(true);
  });

  it("rejects protocol-relative and retired storage URLs", () => {
    expect(logoSchema.safeParse("//evil.com/logo.png").success).toBe(false);
    expect(
      logoSchema.safeParse(
        "https://demo.supabase.co/storage/v1/object/public/logos/x.png"
      ).success
    ).toBe(false);
  });

  it("allows only configured external image hosts over HTTPS", () => {
    expect(
      logoSchema.safeParse("https://storage.googleapis.com/logos/x.png").success
    ).toBe(true);
    expect(
      logoSchema.safeParse("http://storage.googleapis.com/logos/x.png").success
    ).toBe(false);
    expect(logoSchema.safeParse("https://example.com/logo.png").success).toBe(
      false
    );
  });
});
