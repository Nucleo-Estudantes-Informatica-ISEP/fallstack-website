// @vitest-environment node
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

import { getPublicCompanyRoster } from "@/application/services/publicEditionService";

import Page from "./page";

const config = vi.hoisted(() => ({ SHOWCASE_FULL_WEBSITE: false }));
vi.mock("@/config/env.server", () => ({ serverEnv: config }));
vi.mock("@/application/services/publicEditionService", () => ({
  getPublicCompanyRoster: vi.fn(async (language: string) => [language]),
  getPublicFaqs: async (language: string) => [language],
  getPublicSchedule: async (language: string) => [language],
  getPublicSponsors: async () => ["public"],
}));
afterEach(() => {
  config.SHOWCASE_FULL_WEBSITE = false;
});
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found");
  },
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
  default: ({ section, data }: { section: string; data: string[] }) => (
    <span>
      {section} {data[0]}
    </span>
  ),
}));

test.each([
  ["pt", "PT"],
  ["en", "EN"],
])("serves countdown for %s", async (slug, language) => {
  const page = await Page({ params: Promise.resolve({ language: slug }) });
  const html = renderToStaticMarkup(page);
  expect(getPublicCompanyRoster).toHaveBeenLastCalledWith(language);
  expect(html).toContain(`Countdown ${language}`);
  expect(html).toContain(`<span>Partners ${language}</span>`);
  expect(html).not.toContain("Full website");
});

test("showcase renders the full website in the resolved language", async () => {
  config.SHOWCASE_FULL_WEBSITE = true;
  const page = await Page({ params: Promise.resolve({ language: "pt" }) });
  const html = renderToStaticMarkup(page);
  expect(html).toContain("Full website");
  for (const section of ["schedule", "companies", "faqs"]) {
    expect(html).toContain(`${section} PT`);
  }
  expect(html).toContain("sponsors public");
  expect(html).not.toContain("Countdown");
});

test("a failed refresh cannot produce a cacheable page with missing partners", async () => {
  vi.mocked(getPublicCompanyRoster).mockRejectedValueOnce(
    new Error("DB unavailable")
  );
  await expect(
    Page({ params: Promise.resolve({ language: "pt" }) })
  ).rejects.toThrow("DB unavailable");
});

test("rejects paths outside the two public language variants", async () => {
  await expect(
    Page({ params: Promise.resolve({ language: "fr" }) })
  ).rejects.toThrow("Not found");
});
