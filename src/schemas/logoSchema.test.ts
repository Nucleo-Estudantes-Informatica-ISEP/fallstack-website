import { describe, expect, it } from "vitest";

import { logoSchema } from "./logoSchema";

describe("logoSchema", () => {
  it("rejects deleted logo paths but accepts app media and other assets", () => {
    expect(
      logoSchema.safeParse("/assets/images/sponsors/redbull.png").success
    ).toBe(false);
    expect(
      logoSchema.safeParse("/assets/images/companies/gold/cgi.webp").success
    ).toBe(false);
    expect(logoSchema.safeParse("/other/logo.png").success).toBe(true);
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

  it.each([
    "/assets/../api/media/avatar/./id",
    "/assets/%2e%2e/api/media/avatar/id",
    "/assets/..%2fapi/media/avatar/id",
    "/api/media/avatar/%30id",
    "/assets/..\\api/media/avatar/id",
    "/assets/..\t/api/media/avatar/id",
  ])("rejects ambiguous storage paths: %s", (value) => {
    expect(logoSchema.safeParse(value).success).toBe(false);
  });

  it("allows encoded query values on canonical paths", () => {
    expect(logoSchema.safeParse("/assets/logo.png?token=%2e%2e").success).toBe(
      true
    );
    expect(
      logoSchema.safeParse(
        "/api/media/logo/00000000-0000-0000-0000-000000000000?token=%2f"
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
