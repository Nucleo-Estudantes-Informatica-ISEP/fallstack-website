// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

import { getInterests } from "@/application/services/interestService";
import getServerSession from "@/application/services/sessionService";

import SignUpPage from "./page";

const mockEnv = vi.hoisted(() => ({
  EVENT_MODE: "active" as "active" | "offseason",
}));

vi.mock("server-only", () => ({}));

vi.mock("@/config/env.server", () => ({
  serverEnv: mockEnv,
}));

vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));

vi.mock("@/application/services/interestService", () => ({
  getInterests: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "accept-language": "pt-PT" }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/components/AuthNeiButton", () => ({
  default: () => <button>Continuar com AuthNEI</button>,
}));

vi.mock("@/components/StudentSignUp", () => ({
  default: () => <div>Formulário de inscrição</div>,
}));

const studentSession = {
  id: "student-id",
  email: "student@example.test",
  authName: "Estudante AuthNEI",
  role: "STUDENT",
  adminRole: null,
  student: null,
};

function renderPage() {
  return SignUpPage({
    searchParams: Promise.resolve({ lang: "PT" }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockEnv.EVENT_MODE = "active";

  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(getInterests).mockResolvedValue([]);
});

test("shows closed registrations to visitors during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const page = await renderPage();
  const html = renderToStaticMarkup(page);

  expect(html).toContain("Inscrições encerradas");
  expect(html).not.toContain("Continuar com AuthNEI");
  expect(html).not.toContain("Formulário de inscrição");
  expect(getInterests).not.toHaveBeenCalled();
});

test("blocks students without a profile during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  vi.mocked(getServerSession).mockResolvedValue(studentSession as never);

  const page = await renderPage();
  const html = renderToStaticMarkup(page);

  expect(html).toContain("Inscrições encerradas");
  expect(html).not.toContain("Formulário de inscrição");
  expect(getInterests).not.toHaveBeenCalled();
});

test("redirects registered students to their profile during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  vi.mocked(getServerSession).mockResolvedValue({
    ...studentSession,
    student: {
      code: "A123",
      name: "Estudante AuthNEI",
    },
  } as never);

  await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/student/A123");

  expect(getInterests).not.toHaveBeenCalled();
});

test("shows AuthNEI login to visitors in active mode", async () => {
  const page = await renderPage();
  const html = renderToStaticMarkup(page);

  expect(html).toContain("Continuar com AuthNEI");
  expect(html).not.toContain("Inscrições encerradas");
});

test("shows signup form to students without a profile in active mode", async () => {
  vi.mocked(getServerSession).mockResolvedValue(studentSession as never);

  const page = await renderPage();
  const html = renderToStaticMarkup(page);

  expect(html).toContain("Formulário de inscrição");
  expect(html).not.toContain("Inscrições encerradas");
  expect(getInterests).toHaveBeenCalledOnce();
});
