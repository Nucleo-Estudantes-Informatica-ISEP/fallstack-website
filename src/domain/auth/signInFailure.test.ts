import { expect, test } from "vitest";

import { parseSignInFailure } from "./signInFailure";

test.each([
  [undefined, undefined],
  ["", "auth-code-error"],
  ["unexpected", "auth-code-error"],
  ["toString", "auth-code-error"],
  ["auth-verification-required", "auth-verification-required"],
] as const)("maps sign-in error %s to %s", (value, expected) => {
  expect(parseSignInFailure(value)).toBe(expected);
});
