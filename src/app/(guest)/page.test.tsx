// @vitest-environment node
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import Page from "./page";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "accept-language": "en-GB" }),
}));
vi.mock("@/components/CountdownLanding", () => ({
  default: ({
    language,
    children,
  }: {
    language: string;
    children: ReactNode;
  }) => (
    <div>
      Countdown {language}
      {children}
    </div>
  ),
}));
vi.mock("@/components/FeaturedCompanies", () => ({
  default: ({ language }: { language: string }) => (
    <span>Partners {language}</span>
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
    const html = renderToStaticMarkup(page);
    expect(html).toContain(`Countdown ${language}`);
    expect(html).toContain(`<span>Partners ${language}</span>`);
  }
);
