import { describe, expect, it } from "vitest";

import { copyOf, INSTANCE_ID_HEADER, untilOtherCopy } from "./copyUtils";

const response = (headers: Record<string, string>) => ({
  headers: () => headers,
  url: () => "https://example.org/api/health",
});

describe("copyOf", () => {
  it("returns the instance id", () => {
    expect(copyOf(response({ [INSTANCE_ID_HEADER]: "abc12345" }))).toBe(
      "abc12345"
    );
  });

  it("fails loudly when the header is missing", () => {
    expect(() => copyOf(response({}))).toThrow(/x-instance-id/);
  });
});

describe("untilOtherCopy", () => {
  const contextServing = (ids: string[]) => {
    let call = 0;
    return {
      get: async () => response({ [INSTANCE_ID_HEADER]: ids[call++] }),
    } as never;
  };

  it("returns the first different copy", async () => {
    await expect(
      untilOtherCopy(contextServing(["a", "a", "b"]), "a", 5)
    ).resolves.toBe("b");
  });

  it("fails when the proxy stays on one copy", async () => {
    await expect(
      untilOtherCopy(contextServing(["a", "a", "a"]), "a", 3)
    ).rejects.toThrow(/sticky/);
  });
});
