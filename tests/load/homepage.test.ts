import { expect, test } from "vitest";

import { homepageAssets, visitorCookie } from "./homepage";

test("loads unique local assets without following external references", () => {
  expect(
    homepageAssets([
      "/_next/static/app.js",
      "/_next/static/app.js",
      "/_next/image?url=%2Fapi%2Fmedia%2Flogo%2Fa.png&w=256&q=75",
      "/assets/images/landing-2026.png",
      "https://production.example/_next/static/app.js",
      "//production.example/assets/image.png",
      "/_next/\\production.example",
      "/other",
      undefined,
    ])
  ).toEqual([
    "/_next/static/app.js",
    "/_next/image?url=%2Fapi%2Fmedia%2Flogo%2Fa.png&w=256&q=75",
    "/assets/images/landing-2026.png",
  ]);
});

test("alternates guests and authenticated visitors across the cookie pool", () => {
  const cookies = ["session=one", "session=two"];
  expect([1, 2, 3, 4, 5, 6].map((vu) => visitorCookie(vu, cookies))).toEqual([
    undefined,
    "session=one",
    undefined,
    "session=two",
    undefined,
    "session=one",
  ]);
});
