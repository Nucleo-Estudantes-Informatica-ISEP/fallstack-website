// @vitest-environment node
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

import { getPublicCompanyRoster } from "@/application/services/publicEditionService";

import Page from "./page";

const config = vi.hoisted(() => ({
  SHOWCASE_FULL_WEBSITE: false,
  EVENT_MODE: "active" as "active" | "offseason",
}));

vi.mock("@/config/env.server", () => ({ serverEnv: config }));

vi.mock("@/application/services/publicEditionService", () => ({
  getPublicCompanyRoster: vi.fn(async (language: string) => [language]),
  getPublicFaqs: async (language: string) => [language],
  getPublicSchedule: async (language: string) => [language],
  getPublicSponsors: async () => ["public"],
}));

afterEach(() => {
  config.SHOWCASE_FULL_WEBSITE = false;
  config.EVENT_MODE = "active";
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`Redirect: ${path}`);
  },
  notFound: () => {
    throw new Error("Not found");
  },
}));

vi.mock("@/components/CountdownLanding", () => ({
  default: ({
    language,
    callToAction,
    children,
  }: {
    language: string;
    callToAction?: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      Countdown {language}
      <div data-slot="cta">{callToAction}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/HomeCallToAction", () => ({
  default: ({ language }: { language: string }) => (
    <a href="#cta">CTA {language}</a>
  ),
}));

vi.mock("@/components/FeaturedCompanies", () => ({
  default: ({ language }: { language: string }) => (
    <span>Partners {language}</span>
  ),
}));

vi.mock("@/components/HomePage", () => ({
  default: ({
    language,
    sections,
  }: {
    language: string;
    sections: Record<string, ReactNode>;
  }) => (
    <main>
      Full website {language} {Object.values(sections)}
    </main>
  ),
}));

vi.mock("@/components/HomepageSection", () => ({
  default: ({ section, data }: { section: string; data: string[] }) => (
    <span>
      {section} {data[0]}
    </span>
  ),
}));

vi.mock("@/components/OffseasonLanding", () => ({
  default: ({ language }: { language: string }) => (
    <main>Offseason landing {language}</main>
  ),
}));

test.each([
  ["pt", "PT"],
  ["en", "EN"],
])("serves countdown for %s", async (slug, language) => {
  const page = await Page({
    params: Promise.resolve({ language: slug }),
  });

  const html = renderToStaticMarkup(page);

  expect(getPublicCompanyRoster).toHaveBeenLastCalledWith(language);
  expect(html).toContain(`Countdown ${language}`);
  expect(html).toContain(
    `<div data-slot="cta"><a href="#cta">CTA ${language}</a></div>`
  );
  expect(html).toContain(`<span>Partners ${language}</span>`);
  expect(html).not.toContain("Full website");
  expect(html).not.toContain("Offseason landing");
});

test.each([
  ["pt", "PT"],
  ["en", "EN"],
])("showcase renders the full website in %s", async (slug, language) => {
  config.SHOWCASE_FULL_WEBSITE = true;

  const page = await Page({
    params: Promise.resolve({ language: slug }),
  });

  const html = renderToStaticMarkup(page);

  expect(html).toContain(`Full website ${language}`);

  for (const section of ["schedule", "companies", "faqs"]) {
    expect(html).toContain(`${section} ${language}`);
  }

  expect(html).toContain("sponsors public");
  expect(html).not.toContain("Countdown");
  expect(html).not.toContain("Offseason landing");
});

test("a failed refresh cannot produce a cacheable page with missing partners", async () => {
  vi.mocked(getPublicCompanyRoster).mockRejectedValueOnce(
    new Error("DB unavailable")
  );

  await expect(
    Page({
      params: Promise.resolve({ language: "pt" }),
    })
  ).rejects.toThrow("DB unavailable");
});

test("rejects paths outside the two public language variants", async () => {
  await expect(
    Page({
      params: Promise.resolve({ language: "fr" }),
    })
  ).rejects.toThrow("Not found");
});

test.each([
  ["pt", "PT"],
  ["en", "EN"],
])("shows offseason landing for %s", async (slug, language) => {
  config.EVENT_MODE = "offseason";
  config.SHOWCASE_FULL_WEBSITE = true;

  vi.mocked(getPublicCompanyRoster).mockClear();

  const page = await Page({
    params: Promise.resolve({ language: slug }),
  });

  const html = renderToStaticMarkup(page);

  expect(html).toContain(`Offseason landing ${language}`);
  expect(html).not.toContain("Full website");
  expect(html).not.toContain("Countdown");
  expect(getPublicCompanyRoster).not.toHaveBeenCalled();
});
