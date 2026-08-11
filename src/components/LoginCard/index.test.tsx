import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginCard from ".";

const {
  pushMock,
  replaceMock,
  refreshMock,
  logInMock,
  signUpEmployeeMock,
  fetchSessionMock,
  getSessionMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  logInMock: vi.fn(),
  signUpEmployeeMock: vi.fn(),
  fetchSessionMock: vi.fn(),
  getSessionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));
vi.mock("react-toastify", () => ({
  toast: { success: toastSuccessMock, error: vi.fn() },
}));
vi.mock("@/client/api/auth", () => ({
  logIn: (...args: unknown[]) => logInMock(...args),
  signUpEmployee: (...args: unknown[]) => signUpEmployeeMock(...args),
}));
// The AuthContext's `user` is always null here, on purpose: it stays stale
// until React's *next* render, exactly like the real AuthContextProvider
// (setUser from fetchSession() doesn't take effect synchronously). If
// LoginCard ever goes back to reading session.user for the redirect
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
  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );
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

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
});

test("sends a STUDENT with a profile to their student page", async () => {
  getSessionMock.mockResolvedValue({
    role: "STUDENT",
    adminRole: null,
    student: { code: "s1", name: "Jane" },
  });

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/student/s1"));
});

test("sends a STUDENT with no profile yet back into signup instead of the homepage", async () => {
  getSessionMock.mockResolvedValue({
    role: "STUDENT",
    adminRole: null,
    student: null,
  });

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signup"));
});

test("sends an admin to the backoffice instead of the homepage, even though role is null", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: "ADMIN",
    student: null,
  });

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/overview"));
});

test("sends a super admin to the backoffice too", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: "SUPER_ADMIN",
    student: null,
  });

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/overview"));
});

test("falls back to the homepage for a session with no role and no admin tier", async () => {
  getSessionMock.mockResolvedValue({
    role: null,
    adminRole: null,
    student: null,
  });

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
});

test("still updates the context (e.g. so TopBar picks up the new session) with the same fetched user, not a second request", async () => {
  const freshUser = { role: "EMPLOYEE", adminRole: null, student: null };
  getSessionMock.mockResolvedValue(freshUser);

  render(<LoginCard />);
  submitLogin();

  await waitFor(() => expect(fetchSessionMock).toHaveBeenCalledWith(freshUser));
  expect(getSessionMock).toHaveBeenCalledTimes(1);
});

test("shows a generic error and doesn't redirect when login fails", async () => {
  logInMock.mockResolvedValue(false);

  render(<LoginCard />);
  submitLogin();

  await screen.findAllByText("Email ou password incorretos.");
  expect(pushMock).not.toHaveBeenCalled();
});

test("opens on the Estudante tab with AuthNEI, not the password form", () => {
  render(<LoginCard />);

  expect(screen.getByText("Continuar com AuthNEI")).toBeInTheDocument();
  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
});

test("the Login tab shows the password form and a link into employee registration", () => {
  render(<LoginCard />);

  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );

  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Código da Empresa (8 dígitos)")
  ).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Ainda não tens conta de colaborador? Regista aqui",
    })
  );

  expect(
    screen.getByRole("heading", { name: "Registo de Colaborador" })
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText("Código da Empresa (8 dígitos)")
  ).toBeInTheDocument();
  // The employee form has its own Email field, distinct from the login one.
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
});

test("Já tens conta? returns from employee registration to the password form", () => {
  render(<LoginCard />);

  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Ainda não tens conta de colaborador? Regista aqui",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: /Já tens conta/ }));

  expect(
    screen.getByRole("heading", { name: "Iniciar Sessão" })
  ).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Código da Empresa (8 dígitos)")
  ).not.toBeInTheDocument();
});

test("switching to Estudante and back resets any in-progress employee registration", () => {
  render(<LoginCard />);

  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Ainda não tens conta de colaborador? Regista aqui",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Estudante (AuthNEI)" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );

  expect(
    screen.getByRole("heading", { name: "Iniciar Sessão" })
  ).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Código da Empresa (8 dígitos)")
  ).not.toBeInTheDocument();
});

test("?modal=employee deep-links into registration, and leaving it clears the param", () => {
  const originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, search: "?modal=employee" },
  });

  render(<LoginCard />);

  expect(
    screen.getByRole("heading", { name: "Registo de Colaborador" })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Já tens conta/ }));

  expect(replaceMock).toHaveBeenCalledWith("/login");

  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

test("a successful employee signup returns to the password form", async () => {
  signUpEmployeeMock.mockResolvedValue(true);

  render(<LoginCard />);
  fireEvent.click(
    screen.getByRole("button", { name: "Login (email e password)" })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Ainda não tens conta de colaborador? Regista aqui",
    })
  );

  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "jane@company.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Jane Doe" },
  });
  fireEvent.change(screen.getByLabelText("Código da Empresa (8 dígitos)"), {
    target: { value: "12345678" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Registar" }));

  await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  expect(
    screen.getByRole("heading", { name: "Iniciar Sessão" })
  ).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Código da Empresa (8 dígitos)")
  ).not.toBeInTheDocument();
});
