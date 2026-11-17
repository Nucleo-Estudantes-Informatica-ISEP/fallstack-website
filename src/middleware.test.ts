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

test("staging request receives X-Robots-Tag noindex, nofollow, noarchive header", () => {
  const response = middleware(
    new NextRequest("https://staging.fallstack.nei-isep.org/event/pt", {
      headers: {
        host: "staging.fallstack.nei-isep.org",
      },
    })
  );
  expect(response.headers.get("X-Robots-Tag")).toBe(
    "noindex, nofollow, noarchive"
  );
});

test("staging proxy request via x-forwarded-host receives X-Robots-Tag noindex header", () => {
  const response = middleware(
    new NextRequest("http://127.0.0.1:4000/event/pt", {
      headers: {
        "x-forwarded-host": "staging.fallstack.nei-isep.org",
      },
    })
  );
  expect(response.headers.get("X-Robots-Tag")).toBe(
    "noindex, nofollow, noarchive"
  );
});

test("production request NEVER receives X-Robots-Tag noindex header", () => {
  const response = middleware(
    new NextRequest("https://fallstack.nei-isep.org/event/pt", {
      headers: {
        host: "fallstack.nei-isep.org",
      },
    })
  );
  expect(response.headers.get("X-Robots-Tag")).toBeNull();
});

test("production guard: production hostname prevents noindex even with staging env variable", () => {
  process.env.APP_ENV = "staging";
  process.env.IS_STAGING = "true";

  const response = middleware(
    new NextRequest("https://fallstack.nei-isep.org/event/pt", {
      headers: {
        host: "fallstack.nei-isep.org",
      },
    })
  );
  expect(response.headers.get("X-Robots-Tag")).toBeNull();

  delete process.env.APP_ENV;
  delete process.env.IS_STAGING;
});

