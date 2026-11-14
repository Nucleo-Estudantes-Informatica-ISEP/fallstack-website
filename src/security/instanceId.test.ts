import { describe, expect, it } from "vitest";

import { instanceId, needsCsp } from "./instanceId";

describe("instanceId", () => {
  it("is a short opaque hex value", () => {
    expect(instanceId).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("needsCsp", () => {
  it("applies to pages", () => {
    expect(needsCsp("/login", new Headers())).toBe(true);
    expect(needsCsp("/company/armis", new Headers())).toBe(true);
  });

  it.each(["/about", "/privacy-policy", "/terms", "/event/pt", "/event/en"])(
    "exempts only the exact public document path %s",
    (path) => {
      expect(needsCsp(path, new Headers())).toBe(false);
      expect(needsCsp(`${path}/`, new Headers())).toBe(false);
      expect(needsCsp(`${path}/another-page`, new Headers())).toBe(true);
      expect(needsCsp(`${path}-other`, new Headers())).toBe(true);
    }
  );

  it("keeps unsupported event languages under the nonce policy", () => {
    expect(needsCsp("/event/fr", new Headers())).toBe(true);
  });

  it("skips API routes", () => {
    expect(needsCsp("/api", new Headers())).toBe(false);
    expect(needsCsp("/api/health", new Headers())).toBe(false);
  });

  it("skips the language redirect", () => {
    expect(needsCsp("/", new Headers())).toBe(false);
  });

  it("keeps pages that merely start with api", () => {
    expect(needsCsp("/apiary", new Headers())).toBe(true);
  });

  it("skips prefetch requests", () => {
    expect(
      needsCsp("/login", new Headers({ "next-router-prefetch": "1" }))
    ).toBe(false);
    expect(needsCsp("/login", new Headers({ purpose: "prefetch" }))).toBe(
      false
    );
  });
});
