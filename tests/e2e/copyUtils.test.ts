import { describe, expect, it } from "vitest";

import {
  collectCopies,
  copyOf,
  INSTANCE_ID_HEADER,
  repeatOnOtherCopy,
  repeatUntilCopy,
} from "./copyUtils";

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

describe("repeatOnOtherCopy", () => {
  const serving = (ids: string[]) => {
    let call = 0;
    return async () => response({ [INSTANCE_ID_HEADER]: ids[call++] });
  };

  it("returns the first response from a different copy", async () => {
    const result = await repeatOnOtherCopy(serving(["a", "a", "b"]), "a", 5);
    expect(copyOf(result)).toBe("b");
  });

  it("fails when the proxy stays on one copy", async () => {
    await expect(
      repeatOnOtherCopy(serving(["a", "a", "a"]), "a", 3)
    ).rejects.toThrow(/sticky/);
  });
});

describe("repeatUntilCopy", () => {
  const serving = (ids: string[]) => {
    let call = 0;
    return async () => response({ [INSTANCE_ID_HEADER]: ids[call++] });
  };

  it("returns the first response from the target copy", async () => {
    const result = await repeatUntilCopy(serving(["b", "c", "a"]), "a", 5);
    expect(copyOf(result)).toBe("a");
  });

  it("fails when the target copy never answers", async () => {
    await expect(
      repeatUntilCopy(serving(["b", "c", "b"]), "a", 3)
    ).rejects.toThrow(/never answered/);
  });
});

describe("collectCopies", () => {
  const serving = (ids: string[]) => {
    let call = 0;
    return async () => response({ [INSTANCE_ID_HEADER]: ids[call++] });
  };

  it("stops once every copy answered and checks each response", async () => {
    const checked: string[] = [];
    const seen = await collectCopies(
      serving(["a", "b", "a", "c", "z"]),
      3,
      10,
      (r) => {
        checked.push(copyOf(r));
      }
    );
    expect([...seen].sort()).toEqual(["a", "b", "c"]);
    expect(checked).toEqual(["a", "b", "a", "c"]);
  });

  it("returns the partial set when a copy is never reached", async () => {
    const seen = await collectCopies(
      serving(["a", "b", "a", "b"]),
      3,
      4,
      () => {}
    );
    expect(seen.size).toBe(2);
  });
});
