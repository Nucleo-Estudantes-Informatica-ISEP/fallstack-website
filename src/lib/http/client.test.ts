import { afterEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "./client";

vi.mock("client-only", () => ({}));
vi.mock("@/config/api", () => ({ BASE_URL: "/api" }));

afterEach(() => vi.unstubAllGlobals());

test("an error keeps the parsed JSON body and the response headers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "dup", student: { name: "A" } }), {
          status: 409,
          headers: { "content-type": "application/json", "Retry-After": "3" },
        })
    )
  );
  const error = await httpClient.post("/x", {}).catch((caught) => caught);
  expect(error).toBeInstanceOf(HttpClientError);
  expect(error).toMatchObject({
    message: "dup",
    status: 409,
    body: { error: "dup", student: { name: "A" } },
  });
  expect(error.headers.get("Retry-After")).toBe("3");
});

test("a non-JSON error still reports the status text", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response("nope", { status: 502, statusText: "Bad Gateway" })
    )
  );
  const error = await httpClient.get("/x").catch((caught) => caught);
  expect(error).toMatchObject({
    message: "Bad Gateway",
    status: 502,
    body: undefined,
  });
});
