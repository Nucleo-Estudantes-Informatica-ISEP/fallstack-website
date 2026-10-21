import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import CompaniesSection from "@/components/Companies/CompaniesSection";
import FaqSection from "@/components/Faq/FaqSection";
import ScheduleSection from "@/components/ScheduleSection";
import SponsorsSection from "@/components/SponsorsSection";
import type { HomepageDto } from "@/application/dto/homepageDto";

import Content from ".";

vi.mock("@/lib/http/client", () => ({ httpClient: { get: vi.fn() } }));
beforeAll(() =>
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
);
afterAll(() => vi.unstubAllGlobals());
const data: HomepageDto = {
  faqs: [{ id: "faq", question: "Where?", answer: "At ISEP", order: 0 }],
  schedule: [
    {
      id: "late",
      day: 1,
      order: 1,
      startTime: "10:00",
      endTime: "11:00",
      activity: "Later event",
    },
    {
      id: "early",
      day: 1,
      order: 0,
      startTime: "09:00",
      endTime: "10:00",
      activity: "Opening",
    },
    {
      id: "day2",
      day: 2,
      order: 0,
      startTime: "09:00",
      endTime: "10:00",
      activity: "Second day",
    },
  ],
  sponsors: [
    {
      id: "sponsor",
      name: "Supporter",
      logo: "/logo.svg",
      website: "https://example.com",
      order: 0,
    },
  ],
  companies: [2, 1].map((order) => ({
    id: `company-${order}`,
    name: `Company ${order}`,
    avatar: null,
    website: null,
    order: 0,
    rank: { id: `rank-${order}`, name: `Rank ${order}`, order, style: null },
    logoWidth: null,
    logoHeight: null,
    className: null,
    interests: [],
    hasContent: false,
  })),
};

const sections = (data: HomepageDto) => ({
  faqs: <FaqSection faqs={data.faqs} />,
  schedule: (
    <ScheduleSection
      firstDayTitle="17 de Novembro"
      secondDayTitle="18 de Novembro"
      events={data.schedule}
    />
  ),
  sponsors: <SponsorsSection sponsors={data.sponsors} />,
  companies: <CompaniesSection companies={data.companies} />,
});

test("server HTML contains initial public data in schedule/rank order without API effects", () => {
  const html = renderToString(
    <Content
      contentRef={createRef<HTMLDivElement>()}
      sections={sections(data)}
    />
  );
  for (const content of [
    "Where?",
    "Opening",
    "Later event",
    "Supporter",
    "Company 1",
    "Company 2",
  ])
    expect(html).toContain(content);
  expect(html.indexOf("Opening")).toBeLessThan(html.indexOf("Later event"));
  expect(html.indexOf("Company 1")).toBeLessThan(html.indexOf("Company 2"));
  expect(httpClient.get).not.toHaveBeenCalled();
});

test("hydrated sections retain day tabs, FAQ interaction and updated localized props without fetching", () => {
  const { rerender } = render(
    <Content
      contentRef={createRef<HTMLDivElement>()}
      sections={sections(data)}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "18 de Novembro" }));
  expect(screen.getByText("Second day")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Where?" }));
  expect(screen.getByRole("region", { name: "Where?" })).toHaveTextContent(
    "At ISEP"
  );
  rerender(
    <Content
      contentRef={createRef<HTMLDivElement>()}
      sections={sections({
        ...data,
        faqs: [{ ...data.faqs[0], question: "Onde?", answer: "No ISEP" }],
      })}
    />
  );
  expect(screen.getByRole("button", { name: "Onde?" })).toBeInTheDocument();
  expect(httpClient.get).not.toHaveBeenCalled();
});
