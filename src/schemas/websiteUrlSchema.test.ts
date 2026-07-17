import { describe, expect, it } from "vitest";

import { websiteUrlSchema } from "@/schemas/websiteUrlSchema";

describe("websiteUrlSchema", () => {
  it("accepts an https URL", () => {
    expect(websiteUrlSchema.safeParse("https://example.com").success).toBe(
      true
    );
  });

  it("accepts an http URL", () => {
    expect(websiteUrlSchema.safeParse("http://example.com").success).toBe(true);
  });

  it("rejects a javascript: URL", () => {
    expect(websiteUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false
    );
  });

  it("rejects a data: URL", () => {
    expect(
      websiteUrlSchema.safeParse("data:text/html,<script>alert(1)</script>")
        .success
    ).toBe(false);
  });
});
