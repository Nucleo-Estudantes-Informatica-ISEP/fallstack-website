// @vitest-environment node
import { NextRequest } from "next/server";
import { expect, test } from "vitest";

import { middleware } from "./middleware";

test.each(["/", "/login", "/api/faqs"])(
  "applies saved English preference on %s",
  (path) => {
    const response = middleware(
      new NextRequest(`https://example.com${path}`, {
        headers: {
          cookie: "fallstack-language=en",
          "accept-language": "pt-PT",
        },
      })
    );
    expect(response.headers.get("x-middleware-request-accept-language")).toBe(
      "en"
    );
  }
);

test("ignores unsupported saved languages", () => {
  const response = middleware(
    new NextRequest("https://example.com/", {
      headers: {
        cookie: "fallstack-language=invalid",
        "accept-language": "pt-PT",
      },
    })
  );
  expect(response.headers.get("x-middleware-request-accept-language")).toBe(
    "pt-PT"
  );
});
