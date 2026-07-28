import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginPage from "./page";

const { pushMock, refreshMock, logInMock, fetchSessionMock, sessionUserMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    logInMock: vi.fn(),
    fetchSessionMock: vi.fn(),
    sessionUserMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/client/api/auth", () => ({
  logIn: (...args: unknown[]) => logInMock(...args),
}));
vi.mock("@/hooks/useSession", () => ({
  default: () => ({
    user: sessionUserMock(),
    fetchSession: fetchSessionMock,
    clear: vi.fn(),
  }),
}));
vi.mock("@/components/AuthNeiButton", () => ({
  default: () => <button>Continuar com AuthNEI</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  logInMock.mockResolvedValue(true);
});

const submitLogin = () => {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "jane@isep.ipp.pt" },
  });
  fireEvent.change(screen.getByLabelText("A tua palavra-passe"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
};

test("sends an EMPLOYEE to the dashboard", async () => {
  sessionUserMock.mockReturnValue({
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
});

test("sends a STUDENT with a profile to their student page", async () => {
  sessionUserMock.mockReturnValue({
    role: "STUDENT",
    adminRole: null,
    student: { code: "s1", name: "Jane" },
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/student/s1"));
});

test("sends a STUDENT with no profile yet back into signup instead of the homepage", async () => {
  sessionUserMock.mockReturnValue({
    role: "STUDENT",
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signup"));
});

test("sends an admin to the backoffice instead of the homepage, even though role is null", async () => {
  sessionUserMock.mockReturnValue({
    role: null,
    adminRole: "ADMIN",
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/students"));
});

test("sends a super admin to the backoffice too", async () => {
  sessionUserMock.mockReturnValue({
    role: null,
    adminRole: "SUPER_ADMIN",
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/students"));
});

test("falls back to the homepage for a session with no role and no admin tier", async () => {
  sessionUserMock.mockReturnValue({
    role: null,
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
});

test("shows a generic error and doesn't redirect when login fails", async () => {
  logInMock.mockResolvedValue(false);
  sessionUserMock.mockReturnValue(null);

  render(<LoginPage />);
  submitLogin();

  await screen.findAllByText("Email ou password incorretos.");
  expect(pushMock).not.toHaveBeenCalled();
});
