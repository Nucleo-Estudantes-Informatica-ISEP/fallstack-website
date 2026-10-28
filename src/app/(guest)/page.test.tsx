// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import Page from "./page";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "accept-language": "en-GB" }),
}));
vi.mock("@/components/CountdownLanding", () => ({
  default: ({ language }: { language: string }) => (
    <div>Countdown {language}</div>
  ),
}));
vi.mock("@/components/HomepageSection", () => {
  throw new Error("Countdown must not load unpublished event content");
});

test.each([
  [{ lang: "PT" }, "PT"],
  [{}, "EN"],
])(
  "serves countdown with resolved language %j",
  async (searchParams, language) => {
    const page = await Page({ searchParams: Promise.resolve(searchParams) });
    expect(renderToStaticMarkup(page)).toBe(`<div>Countdown ${language}</div>`);
  }
);
