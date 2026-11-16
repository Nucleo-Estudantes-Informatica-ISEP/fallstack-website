import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { SessionDto } from "@/application/dto/sessionDto";
import { Language } from "@/domain/i18n/translations";

import HomeCallToAction from ".";

const session = vi.hoisted(() => ({
  current: { user: null as SessionDto | null, ready: true },
}));

vi.mock("@/hooks/useSession", () => ({ default: () => session.current }));

const student: SessionDto = {
  role: "STUDENT",
  adminRole: null,
  student: { code: "AB12", name: "Ana" },
};

beforeEach(() => {
  session.current = { user: null, ready: true };
});

test("guests are offered registration and sign-in", () => {
  render(<HomeCallToAction language={Language.PT} />);

  expect(
    screen.getByRole("link", { name: "Quero registar-me no evento" })
  ).toHaveAttribute("href", "/signup");
  expect(
    screen.getByRole("link", { name: "Já tens conta? Inicia sessão" })
  ).toHaveAttribute("href", "/login");
});

test("guest copy follows the page language", () => {
  render(<HomeCallToAction language={Language.EN} />);

  expect(
    screen.getByRole("link", { name: "Register for the event" })
  ).toHaveAttribute("href", "/signup");
  expect(
    screen.getByRole("link", { name: "Already registered? Sign in" })
  ).toHaveAttribute("href", "/login");
});

test("signed-in students go straight to their dashboard instead of registering", () => {
  session.current = { user: student, ready: true };
  render(<HomeCallToAction language={Language.PT} />);

  expect(
    screen.getByRole("link", { name: "Ver o meu perfil" })
  ).toHaveAttribute("href", "/student/AB12");
  expect(screen.queryByRole("link", { name: /registar/i })).toBeNull();
  expect(screen.queryByRole("link", { name: /sessão/i })).toBeNull();
});

test("students who stopped mid-onboarding can finish registering", () => {
  session.current = { user: { ...student, student: null }, ready: true };
  render(<HomeCallToAction language={Language.EN} />);

  expect(
    screen.getByRole("link", { name: "Finish my registration" })
  ).toHaveAttribute("href", "/signup");
});

test("NEI staff without a student profile are sent to the scanner", () => {
  session.current = {
    user: { ...student, student: null, neiMember: true },
    ready: true,
  };
  render(<HomeCallToAction language={Language.PT} />);

  expect(
    screen.getByRole("link", { name: "Abrir o scanner de presenças" })
  ).toHaveAttribute("href", "/attendance/scan");
});

test.each([
  [
    { role: "EMPLOYEE", adminRole: null, student: null },
    "Ir para o dashboard da empresa",
    "/dashboard",
  ],
  [
    { role: null, adminRole: "ADMIN", student: null },
    "Abrir a área de administração",
    "/overview",
  ],
] as const)(
  "other signed-in accounts get their own destination (%j)",
  (user, name, href) => {
    session.current = { user, ready: true };
    render(<HomeCallToAction language={Language.PT} />);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  }
);

test("renders no link while the session is still being resolved", () => {
  // Without this, a returning student sees the guest action flash before
  // their session arrives and can click into registration by mistake.
  session.current = { user: null, ready: false };
  const { container } = render(<HomeCallToAction language={Language.PT} />);

  expect(screen.queryByRole("link")).toBeNull();
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
});

test("renders nothing for an account without a usable destination", () => {
  session.current = {
    user: { role: null, adminRole: null, student: null },
    ready: true,
  };
  const { container } = render(<HomeCallToAction language={Language.PT} />);

  expect(container).toBeEmptyDOMElement();
});

test("admins also get a direct link to the attendance scanner on the homepage", () => {
  session.current = {
    user: { role: null, adminRole: "ADMIN", student: null },
    ready: true,
  };
  render(<HomeCallToAction language={Language.PT} />);

  expect(
    screen.getByRole("link", { name: "Abrir a área de administração" })
  ).toHaveAttribute("href", "/overview");
  expect(
    screen.getByRole("link", { name: "Abrir o scanner de presenças" })
  ).toHaveAttribute("href", "/attendance/scan");
});
