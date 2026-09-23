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
    screen.getByRole("button", {
      name: "Tens um código de empresa? Regista-te como colaborador",
    })
  ).toBeInTheDocument();
});

test("employee onboarding requires AuthNEI first when logged out", () => {
  render(<LoginCard />);

  fireEvent.click(
    screen.getByRole("button", {
      name: "Tens um código de empresa? Regista-te como colaborador",
    })
  );

  expect(
    screen.getByRole("heading", { name: "Registo de Colaborador" })
  ).toBeInTheDocument();
  expect(screen.getByText("Continuar com AuthNEI")).toHaveAttribute(
    "data-next",
    "/login?modal=employee"
  );
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
