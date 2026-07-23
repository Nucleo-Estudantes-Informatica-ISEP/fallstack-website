import { expect, test } from "vitest";

import { sanitizeNext } from "./sanitizeNext";

test("defaults to / for a missing next", () => {
  expect(sanitizeNext(null)).toBe("/");
});

test("defaults to / for a protocol-relative next (//host)", () => {
  expect(sanitizeNext("//evil.com")).toBe("/");
});

test("defaults to / for a next not starting with /", () => {
  expect(sanitizeNext("evil.com")).toBe("/");
});

test("defaults to / for a backslash next that would normalize to an external host", () => {
  // WHATWG URL parsing turns a leading /\ into // for http(s) URLs, so this
  // would otherwise resolve to https://evil.com once handed to `new URL()`.
  expect(sanitizeNext("/\\evil.com")).toBe("/");
  expect(sanitizeNext("/\\/evil.com")).toBe("/");
});

test("allows a plain in-app relative path through unchanged", () => {
  expect(sanitizeNext("/dashboard")).toBe("/dashboard");
});
