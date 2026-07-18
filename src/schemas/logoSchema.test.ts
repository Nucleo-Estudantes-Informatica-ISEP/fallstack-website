import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// logoSchema reads serverEnv.NODE_ENV (see logoSchema.ts) once a value falls
// through to host/path matching, so the server-env schema needs valid stub
// values - CI runs `pnpm test` with no .env file at all.
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("JWT_SECRET", "a".repeat(32));
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

const { logoSchema } = await import("@/schemas/logoSchema");

describe("logoSchema", () => {
  it("accepts an absolute path into public/", () => {
    expect(
      logoSchema.safeParse("/assets/images/sponsors/redbull.png").success
    ).toBe(true);
  });

  it("rejects a protocol-relative value", () => {
    expect(logoSchema.safeParse("//evil.com/logo.png").success).toBe(false);
  });

  it("accepts a Supabase public-storage URL", () => {
    expect(
      logoSchema.safeParse(
        "https://demo.supabase.co/storage/v1/object/public/logos/x.png"
      ).success
    ).toBe(true);
  });

  it("rejects a Supabase URL outside the configured storage path", () => {
    expect(
      logoSchema.safeParse("https://demo.supabase.co/not-storage/logo.png")
        .success
    ).toBe(false);
  });

  it("rejects an arbitrary external host", () => {
    expect(logoSchema.safeParse("https://example.com/logo.png").success).toBe(
      false
    );
  });

  it("rejects http for a host that's only allowed over https", () => {
    expect(
      logoSchema.safeParse(
        "http://demo.supabase.co/storage/v1/object/public/logos/x.png"
      ).success
    ).toBe(false);
  });
});
