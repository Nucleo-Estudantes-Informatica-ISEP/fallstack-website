import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { SessionDto } from "@/application/dto/sessionDto";
import { Language } from "@/domain/i18n/translations";

import Hero from ".";

const session = vi.hoisted(() => ({
  current: { user: null as SessionDto | null, ready: true },
}));

vi.mock("@/hooks/useSession", () => ({ default: () => session.current }));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

afterEach(() => {
  vi.unstubAllGlobals();
  session.current = { user: null, ready: true };
});

test("the hero logo has a reduced maximum width", () => {
  render(
    <Hero contentRef={createRef<HTMLDivElement>()} language={Language.PT} />
  );
  expect(screen.getByAltText(/fallstack/i)).toHaveClass(
    "max-w-56",
    "object-contain"
  );
});

test("guests are offered registration in the hero", () => {
  render(
    <Hero contentRef={createRef<HTMLDivElement>()} language={Language.PT} />
  );
  expect(
    screen.getByRole("link", { name: "Quero registar-me no evento" })
  ).toHaveAttribute("href", "/signup");
});

test("signed-in students get their dashboard instead of an empty hero", () => {
  session.current = {
    user: {
      role: "STUDENT",
      adminRole: null,
      student: { code: "AB12", name: "Ana" },
    },
    ready: true,
  };
  render(
    <Hero contentRef={createRef<HTMLDivElement>()} language={Language.EN} />
  );
  expect(screen.getByRole("link", { name: "View my profile" })).toHaveAttribute(
    "href",
    "/student/AB12"
  );
  expect(screen.queryByRole("link", { name: /register/i })).toBeNull();
});
