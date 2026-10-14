import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import HomePage from "@/components/HomePage";
import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));

const startsAt = Date.parse(branding.event.startsAt);
const values = () =>
  within(screen.getByRole("timer"))
    .getAllByRole("definition")
    .map((element) => element.textContent);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("renders hydration-safe placeholders before the browser clock starts", () => {
  const html = renderToString(<HomePage language={Language.PT} />);
  expect(html.match(/>--</g)).toHaveLength(4);
});

test("counts down to 17 November at 08:30 Lisbon time", () => {
  expect(branding.event.startsAt).toBe("2026-11-17T08:30:00+00:00");
  vi.setSystemTime(startsAt - (86400 + 3600 + 60 + 1) * 1000);
  render(<HomePage language={Language.PT} />);
  expect(values()).toEqual(["01", "01", "01", "01"]);
  expect(screen.getByText("17 de novembro de 2026")).toHaveAttribute(
    "dateTime",
    branding.event.startsAt
  );
  expect(screen.getByText(/serão anunciados em breve/)).toBeInTheDocument();
});

test("updates every second and rolls days into hours", () => {
  vi.setSystemTime(startsAt - 86400 * 1000);
  render(<HomePage language={Language.EN} />);
  expect(values()).toEqual(["01", "00", "00", "00"]);
  act(() => vi.advanceTimersByTime(1000));
  expect(values()).toEqual(["00", "23", "59", "59"]);
  expect(screen.getByText("Days")).toBeInTheDocument();
  expect(screen.getByText(/will be announced soon/)).toBeInTheDocument();
});

test("keeps the final partial second and clamps at zero after expiry", () => {
  vi.setSystemTime(startsAt - 500);
  render(<HomePage language={Language.EN} />);
  expect(values()).toEqual(["00", "00", "00", "01"]);
  act(() => vi.advanceTimersByTime(2000));
  expect(values()).toEqual(["00", "00", "00", "00"]);
  expect(screen.getByText(/will be announced soon/)).toBeInTheDocument();
});

test("already expired countdown stays at zero without revealing old content", () => {
  vi.setSystemTime(startsAt + 86400 * 1000);
  render(<HomePage language={Language.PT} />);
  expect(values()).toEqual(["00", "00", "00", "00"]);
  expect(screen.queryByText("Speed Interviews")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /registar/ })
  ).not.toBeInTheDocument();
});

test("cleans up the timer when leaving the homepage", () => {
  vi.setSystemTime(startsAt - 10000);
  const { unmount } = render(<HomePage language={Language.PT} />);
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
