// @vitest-environment node
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

import Page from "./page";

const config = vi.hoisted(() => ({ SHOWCASE_FULL_WEBSITE: false }));
vi.mock("@/config/env.server", () => ({ serverEnv: config }));
afterEach(() => {
  config.SHOWCASE_FULL_WEBSITE = false;
});
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
vi.mock("@/components/HomePage", () => ({
  default: ({ sections }: { sections: Record<string, ReactNode> }) => (
    <main>Full website {Object.values(sections)}</main>
  ),
}));
vi.mock("@/components/HomepageSection", () => ({
  default: ({ section, language }: { section: string; language: string }) => (
    <span>
      {section} {language}
    </span>
  ),
}));

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
    expect(html).not.toContain("Full website");
  }
);

test("showcase renders the full website in the resolved language", async () => {
  config.SHOWCASE_FULL_WEBSITE = true;
  const page = await Page({ searchParams: Promise.resolve({ lang: "PT" }) });
  const html = renderToStaticMarkup(page);
  expect(html).toContain("Full website");
  for (const section of ["schedule", "companies", "sponsors", "faqs"]) {
    expect(html).toContain(`${section} PT`);
  }
  expect(html).not.toContain("Countdown");
});
