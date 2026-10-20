// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

import {
  afterPublicDataWrite,
  PUBLIC_DATA_LOAD_TIMEOUT_MS,
  publicDataCache,
} from "./publicDataCache";
import { getHomepageData, getPublicFaqs } from "./publicEditionService";
import getServerSession from "./sessionService";

import * as Sentry from "@sentry/nextjs";

const reads = vi.hoisted(() => ({
  faqs: vi.fn(),
  schedule: vi.fn(),
  sponsors: vi.fn(),
  companies: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("./sessionService", () => ({ default: vi.fn() }));
vi.mock("./faqService", () => ({ getFaqEntries: reads.faqs }));
vi.mock("./scheduleService", () => ({ getScheduleEvents: reads.schedule }));
vi.mock("./sponsorService", () => ({ getActiveSponsors: reads.sponsors }));
vi.mock("./companyService", () => ({ getActiveCompanies: reads.companies }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  publicDataCache.invalidate();
  reads.faqs.mockResolvedValue([
    {
      id: "faq",
      question: { PT: "Pergunta", EN: "Question" },
      answer: { PT: "Resposta", EN: "Answer" },
      order: 0,
      privateField: "secret",
    },
  ]);
  reads.schedule.mockResolvedValue([
    {
      id: "event",
      day: 1,
      order: 0,
      startTime: "09:00",
      endTime: "10:00",
      activity: { PT: "Abertura", EN: "Opening" },
    },
  ]);
  reads.sponsors.mockResolvedValue([
    {
      id: "sponsor",
      name: "Sponsor",
      logo: "/logo.svg",
      website: null,
      order: 0,
      active: true,
    },
  ]);
  reads.companies.mockResolvedValue([
    {
      id: "company",
      name: "Company",
      avatar: null,
      website: null,
      order: 0,
      rank: { id: "rank", name: "Rank", order: 0, style: null },
      displayStyle: null,
      interests: [{ name: { PT: "IA", EN: "AI" } }],
      profile: null,
      employeeInviteCodeHash: "secret",
      employees: [{ email: "private@example.com" }],
    },
  ]);
});

test.each([undefined, "invalid", "valid"])(
  "all four public routes ignore identity cookies (%s) and share public DTOs only",
  async (cookie) => {
    vi.mocked(getServerSession).mockRejectedValue(
      new Error("Identity must not be resolved")
    );
    const routes = [
      (await import("@/app/api/faqs/route")).GET,
      (await import("@/app/api/schedule/route")).GET,
      (await import("@/app/api/sponsors/route")).GET,
      (await import("@/app/api/companies/roster/route")).GET,
    ];
    for (const route of routes) {
      for (const lang of ["EN", "PT", "EN"]) {
        const response = await route(
          new NextRequest(`http://localhost/api/example?lang=${lang}`, {
            headers: cookie ? { cookie: `session=${cookie}` } : {},
          }),
          { params: Promise.resolve({}) }
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(JSON.stringify(await response.json())).not.toMatch(
          /secret|private|employees|active/
        );
      }
    }
    expect(getServerSession).not.toHaveBeenCalled();
    expect(reads.faqs).toHaveBeenCalledTimes(2);
    expect(reads.companies).toHaveBeenCalledTimes(2);
    expect(reads.sponsors).toHaveBeenCalledOnce();
    const data = await getHomepageData(Language.EN);
    expect(data.faqs[0].question).toBe("Question");
    expect(data.schedule[0].activity).toBe("Opening");
    expect(data.companies[0].interests).toEqual(["AI"]);
    expect(reads.faqs).toHaveBeenCalledTimes(2);
  }
);

test("write attempts invalidate both languages after settlement", async () => {
  await getPublicFaqs(Language.PT);
  await getPublicFaqs(Language.EN);
  await expect(
    afterPublicDataWrite("faqs", Promise.reject(new Error("rollback")))
  ).rejects.toThrow("rollback");
  await getPublicFaqs(Language.EN);
  expect(reads.faqs).toHaveBeenCalledTimes(3);
  await afterPublicDataWrite("faqs", Promise.resolve());
  await getPublicFaqs(Language.PT);
  await getPublicFaqs(Language.EN);
  expect(reads.faqs).toHaveBeenCalledTimes(5);
});

test("homepage isolates failed sections; API preserves failure status instead of caching empty success", async () => {
  reads.faqs.mockRejectedValue(new Error("unavailable"));
  const data = await getHomepageData(Language.PT);
  expect(data.faqs).toEqual([]);
  expect(data.schedule).toHaveLength(1);
  const { GET } = await import("@/app/api/faqs/route");
  const response = await GET(new NextRequest("http://localhost/api/faqs"), {
    params: Promise.resolve({}),
  });
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
});

test.each(["faqs", "schedule", "sponsors", "companies"] as const)(
  "homepage %s failures reach Sentry once per load during the cooldown and recover",
  async (section) => {
    const error = new Error("unavailable");
    reads[section].mockRejectedValueOnce(error);

    for (let visitor = 0; visitor < 2; visitor++) {
      expect((await getHomepageData(Language.PT))[section]).toEqual([]);
      expect(Sentry.captureException).toHaveBeenLastCalledWith(error, {
        extra: { operation: `homepage_${section}` },
      });
    }
    expect(reads[section]).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Simulate operational cache reset without waiting for the retry cooldown.
    publicDataCache.invalidate();
    expect((await getHomepageData(Language.PT))[section]).toHaveLength(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  }
);

afterEach(() => vi.useRealTimers());

test("a hung section bounds homepage latency, reports once, and recovers after cooldown", async () => {
  vi.useFakeTimers();
  reads.faqs.mockImplementationOnce(() => new Promise(() => {}));
  const visitors = Promise.all(
    Array.from({ length: 100 }, () => getHomepageData(Language.PT))
  );
  await vi.advanceTimersByTimeAsync(PUBLIC_DATA_LOAD_TIMEOUT_MS);
  for (const data of await visitors) {
    expect(data.faqs).toEqual([]);
    expect(data.schedule).toHaveLength(1);
    expect(data.sponsors).toHaveLength(1);
    expect(data.companies).toHaveLength(1);
  }
  expect(reads.faqs).toHaveBeenCalledOnce();
  expect(Sentry.captureException).toHaveBeenCalledOnce();
  expect((await getHomepageData(Language.PT)).faqs).toEqual([]);
  expect(Sentry.captureException).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1000);
  expect((await getHomepageData(Language.PT)).faqs).toHaveLength(1);
  expect(reads.faqs).toHaveBeenCalledTimes(2);
});
