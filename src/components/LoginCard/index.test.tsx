import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginCard from ".";

const { pushMock, replaceMock, refreshMock, fetchSessionMock, sessionState } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    refreshMock: vi.fn(),
    fetchSessionMock: vi.fn(),
    sessionState: { user: null as unknown },
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));
vi.mock("@/hooks/useSession", () => ({
  default: () => ({
    user: sessionState.user,
    fetchSession: fetchSessionMock,
    clear: vi.fn(),
  }),
}));
vi.mock("@/components/AuthNeiButton", () => ({
  default: ({ next }: { next?: string }) => (
    <button data-next={next ?? "/"}>Continuar com AuthNEI</button>
  ),
}));
vi.mock("@/components/EmployeeSignUpForm", () => ({
  default: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button onClick={onSuccess}>Completar associação</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.user = null;
});

test("uses AuthNEI as the single login method", () => {
  render(<LoginCard />);

  expect(screen.getByText("Continuar com AuthNEI")).toBeInTheDocument();
  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("A tua palavra-passe")
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", {
      name: "Tens um código de empresa? Regista-te como colaborador",
    })
  ).toBeInTheDocument();
});

test("offers a create-account link to the signup page", () => {
  render(<LoginCard />);

  expect(
    screen.getByRole("heading", { name: "Iniciar Sessão" })
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Criar uma conta" })).toHaveAttribute(
    "href",
    "/signup"
  );
});

test("sends password recovery to AuthNEI instead of a local reset flow", () => {
  render(<LoginCard />);

  expect(
    screen.getByText(
      "Esqueceste-te da palavra-passe? A recuperação é feita no próprio AuthNEI."
    )
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /palavra-passe/i })
  ).not.toBeInTheDocument();
});

test("employee registration links to the employee signup flow", () => {
  render(<LoginCard />);

  expect(
    screen.getByRole("link", {
      name: "Tens um código de empresa? Regista-te como colaborador",
    })
  ).toHaveAttribute("href", "/signup/employee");
});

test("authenticated users can redeem a company code", () => {
  sessionState.user = {
    role: "STUDENT",
    adminRole: null,
    student: null,
  };

  render(<LoginCard initialView="employee" />);

  expect(screen.getByText("Completar associação")).toBeInTheDocument();
});

test("cancelling employee onboarding clears the modal URL", () => {
  sessionState.user = {
    role: "STUDENT",
    adminRole: null,
    student: null,
  };

  render(<LoginCard initialView="employee" />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(replaceMock).toHaveBeenCalledWith("/login");
});

test("successful employee onboarding refreshes the session and opens dashboard", async () => {
  sessionState.user = {
    role: "STUDENT",
    adminRole: null,
    student: null,
  };

  render(<LoginCard initialView="employee" />);
  fireEvent.click(screen.getByText("Completar associação"));

  await waitFor(() => expect(fetchSessionMock).toHaveBeenCalled());
  expect(pushMock).toHaveBeenCalledWith("/dashboard");
  expect(refreshMock).toHaveBeenCalled();
});

test("offseason hides student and employee registration links", () => {
  render(<LoginCard offseason />);

  expect(screen.getByText("Continuar com AuthNEI")).toBeInTheDocument();

  expect(
    screen.queryByRole("link", { name: "Criar uma conta" })
  ).not.toBeInTheDocument();

  expect(
    screen.queryByRole("link", {
      name: "Tens um código de empresa? Regista-te como colaborador",
    })
  ).not.toBeInTheDocument();
});

test("offseason employee deep-link shows closure before authentication", () => {
  render(<LoginCard initialView="employee" offseason />);

  expect(
    screen.getByText("As inscrições de colaboradores estão encerradas.")
  ).toBeInTheDocument();

  expect(screen.queryByText("Continuar com AuthNEI")).not.toBeInTheDocument();
  expect(screen.queryByText("Completar associação")).not.toBeInTheDocument();
});

test("offseason employee deep-link blocks the form for authenticated users", () => {
  sessionState.user = {
    role: "STUDENT",
    adminRole: null,
    student: null,
  };

  render(<LoginCard initialView="employee" offseason />);

  expect(
    screen.getByText("As inscrições de colaboradores estão encerradas.")
  ).toBeInTheDocument();

  expect(screen.queryByText("Completar associação")).not.toBeInTheDocument();
});

test("offseason employee closure allows returning to the login page", () => {
  render(<LoginCard initialView="employee" offseason />);

  fireEvent.click(
    screen.getByRole("button", { name: "Voltar ao início de sessão" })
  );

  expect(replaceMock).toHaveBeenCalledWith("/login");

  expect(
    screen.getByRole("heading", { name: "Iniciar Sessão" })
  ).toBeInTheDocument();

  expect(screen.getByText("Continuar com AuthNEI")).toBeInTheDocument();
});

test("shows an error alert when auth callback fails", () => {
  render(<LoginCard authError />);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Não foi possível concluir o início de sessão com o AuthNEI"
  );
});

test("existing employees are routed to the dashboard instead of the company-code form", () => {
  sessionState.user = {
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
  };

  render(<LoginCard initialView="employee" />);

  expect(screen.queryByText("Completar associação")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Ir para o dashboard da empresa" })
  ).toHaveAttribute("href", "/dashboard");
});

test("employee signup is a text link without primary-button styling", () => {
  render(<LoginCard />);
  const link = screen.getByRole("link", {
    name: "Tens um código de empresa? Regista-te como colaborador",
  });
  expect(link).toHaveAttribute("href", "/signup/employee");
  expect(link).toHaveClass("text-gray-300", "underline");
  expect(link).not.toHaveClass("bg-white", "px-10", "py-4");
});

test("inactive account explains the blocked state and offers account switching without starting sign-in again", () => {
  render(<LoginCard inactive />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "A tua conta ou empresa está inativa."
  );
  expect(
    screen.getByRole("button", { name: "Usar outra conta" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "support@nei-isep.org" })
  ).toHaveAttribute("href", "mailto:support@nei-isep.org");
  expect(screen.queryByText("Continuar com AuthNEI")).not.toBeInTheDocument();
});
