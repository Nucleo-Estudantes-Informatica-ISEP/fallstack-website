// @vitest-environment node
import { NextRequest } from "next/server";
import { expect, test } from "vitest";

import { GET } from "./route";

test.each([
  ["", "en-GB,en;q=0.9", "/event/en"],
  ["", "pt-PT,pt;q=0.9,en;q=0.8", "/event/pt"],
  ["?lang=PT", "en-GB", "/event/pt"],
  ["?lang=EN&lang=PT", "pt-PT", "/event/en"],
  ["", "fr-FR", "/event/pt"],
])(
  "negotiates %s with %s without allowing shared caching",
  (query, accept, location) => {
    const response = GET(
      new NextRequest(`https://example.com/${query}`, {
        headers: { "Accept-Language": accept },
      })
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(location);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Accept-Language");
  }
);
