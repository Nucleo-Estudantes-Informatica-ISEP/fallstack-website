import { describe, expect, it } from "vitest";

import { instanceId, needsCsp } from "./instanceId";

describe("instanceId", () => {
  it("is a short opaque hex value", () => {
    expect(instanceId).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("needsCsp", () => {
  it("applies to pages", () => {
    expect(needsCsp("/", new Headers())).toBe(true);
    expect(needsCsp("/pt/faq", new Headers())).toBe(true);
  });

  it("skips API routes", () => {
    expect(needsCsp("/api", new Headers())).toBe(false);
    expect(needsCsp("/api/health", new Headers())).toBe(false);
  });

  it("keeps pages that merely start with api", () => {
    expect(needsCsp("/apiary", new Headers())).toBe(true);
  });

  it("skips prefetch requests", () => {
    expect(needsCsp("/", new Headers({ "next-router-prefetch": "1" }))).toBe(
      false
    );
    expect(needsCsp("/", new Headers({ purpose: "prefetch" }))).toBe(false);
  });
});
