import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

import HomepageSection from ".";

vi.mock("server-only", () => ({}));

const originalDates = {
  startsAt: branding.event.startsAt,
  endsAt: branding.event.endsAt,
};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  Object.assign(branding.event, originalDates);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("English programme tabs use the event's November dates in Lisbon", () => {
  expect(branding.event.startsAt).toBe("2026-11-17T08:30:00+00:00");
  expect(branding.event.endsAt).toBe("2026-11-18T17:30:00+00:00");
  render(
    <HomepageSection section="schedule" data={[]} language={Language.EN} />
  );

  expect(
    screen.getByRole("button", { name: "17 November" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "18 November" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Event programme" })
  ).toBeInTheDocument();
});

test("English programme dates follow Lisbon across midnight during daylight saving time", () => {
  vi.stubEnv("TZ", "UTC");
  branding.event.startsAt = "2026-06-17T23:30:00Z";
  branding.event.endsAt = "2026-06-18T23:30:00Z";
  render(
    <HomepageSection section="schedule" data={[]} language={Language.EN} />
  );

  expect(screen.getByRole("button", { name: "18 June" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "19 June" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "17 June" })
  ).not.toBeInTheDocument();
});

test("programme tabs keep the Portuguese edition titles by default", () => {
  render(<HomepageSection section="schedule" data={[]} />);

  for (const title of branding.event.scheduleDayTitles) {
    expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
  }
});
