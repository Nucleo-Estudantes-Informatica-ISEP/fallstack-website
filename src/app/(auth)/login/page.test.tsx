import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginPage from "./page";

const { pushMock, refreshMock, logInMock, fetchSessionMock, getSessionMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    logInMock: vi.fn(),
    fetchSessionMock: vi.fn(),
    getSessionMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/client/api/auth", () => ({
  logIn: (...args: unknown[]) => logInMock(...args),
}));
// The AuthContext's `user` is always null here, on purpose: it stays stale
// until React's *next* render, exactly like the real AuthContextProvider
// (setUser from fetchSession() doesn't take effect synchronously). If
// LoginPage ever goes back to reading session.user for the redirect
// instead of calling getSession() directly, every test below would see a
// null user and wrongly redirect to "/" - that's the regression this file
// guards against, not just "does the right URL get picked".
vi.mock("@/hooks/useSession", () => ({
  default: () => ({
    user: null,
    fetchSession: fetchSessionMock,
    clear: vi.fn(),
  }),
}));
vi.mock("@/client/api/session", () => ({
  default: () => getSessionMock(),
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
  getSessionMock.mockResolvedValue({
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
});

test("sends a STUDENT with a profile to their student page", async () => {
  getSessionMock.mockResolvedValue({
    role: "STUDENT",
    adminRole: null,
    student: { code: "s1", name: "Jane" },
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/student/s1"));
});

test("sends a STUDENT with no profile yet back into signup instead of the homepage", async () => {
  getSessionMock.mockResolvedValue({
    role: "STUDENT",
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signup"));
});

test("sends an admin to the backoffice instead of the homepage, even though role is null", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: "ADMIN",
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/overview"));
});

test("sends a super admin to the backoffice too", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: "SUPER_ADMIN",
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/overview"));
});

test("falls back to the homepage for a session with no role and no admin tier", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
});

test("still calls fetchSession so the rest of the UI (e.g. TopBar) picks up the new session", async () => {
  getSessionMock.mockResolvedValue({
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
  });

  render(<LoginPage />);
  submitLogin();

  await waitFor(() => expect(fetchSessionMock).toHaveBeenCalled());
});

test("shows a generic error and doesn't redirect when login fails", async () => {
  logInMock.mockResolvedValue(false);

  render(<LoginPage />);
  submitLogin();

  await screen.findAllByText("Email ou password incorretos.");
  expect(pushMock).not.toHaveBeenCalled();
});
