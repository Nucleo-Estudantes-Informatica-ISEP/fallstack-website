import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginPage from "@/app/(protected)/(auth)/login/page";

import LoginCard from ".";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: async () => null,
  isCurrentAccountInactive: async () => false,
}));

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
  default: ({
    onSuccess,
    initialCode,
  }: {
    onSuccess?: () => void;
    initialCode?: string;
  }) => (
    <button onClick={onSuccess} data-initial-code={initialCode}>
      Completar associação
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.user = null;
  sessionStorage.clear();
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

test("asks for a valid company code before signed-out users can continue", () => {
  render(<LoginCard initialView="employee" />);
  const code = screen.getByRole("textbox", { name: "Código da Empresa" });
  const continueButton = screen.getByRole("button", {
    name: "Continuar com AuthNEI",
  });

  expect(continueButton).toBeDisabled();
  fireEvent.change(code, { target: { value: "bad!" } });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Código de empresa inválido."
  );
  expect(continueButton).toBeDisabled();
  fireEvent.change(code, { target: { value: "example-invite" } });
  expect(continueButton).toBeEnabled();
});

test("restores the code for explicit confirmation and removes it from browser storage", () => {
  sessionStorage.setItem(
    "fallstack-employee-invite",
    `${Date.now() + 60_000}:example-invite`
  );
  sessionState.user = { role: "STUDENT" };
  render(<LoginCard initialView="employee" />);

  expect(
    screen.getByRole("button", { name: "Completar associação" })
  ).toHaveAttribute("data-initial-code", "example-invite");
  expect(sessionStorage.getItem("fallstack-employee-invite")).toBeNull();
});

test("drops the queued code when the real login page receives an AuthNEI error", async () => {
  sessionStorage.setItem(
    "fallstack-employee-invite",
    `${Date.now() + 60_000}:example-invite`
  );
  render(
    await LoginPage({
      searchParams: Promise.resolve({ error: "auth-code-error" }),
    })
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Não foi possível concluir"
  );
  expect(sessionStorage.getItem("fallstack-employee-invite")).toBeNull();
});

test("cancelling signed-out employee onboarding clears the queued code", () => {
  sessionStorage.setItem(
    "fallstack-employee-invite",
    `${Date.now() + 60_000}:example-invite`
  );

  render(<LoginCard initialView="employee" />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(replaceMock).toHaveBeenCalledWith("/login");
  expect(sessionStorage.getItem("fallstack-employee-invite")).toBeNull();
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
  render(<LoginCard signInFailure="auth-code-error" />);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Não foi possível concluir o início de sessão com o AuthNEI"
  );
});

test.each([
  ["auth-cancelled", "Retomar início de sessão", "/api/auth/login"],
  ["auth-expired", "Reiniciar início de sessão", "/api/auth/login"],
  [
    "auth-verification-required",
    "Verificar email",
    "https://auth.example.test/ui/console/users/me",
  ],
] as const)(
  "offers the appropriate action for %s",
  (signInFailure, action, href) => {
    render(
      <LoginCard
        signInFailure={signInFailure}
        verifyEmailUrl="https://auth.example.test/ui/console/users/me"
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: action })).toHaveAttribute(
      "href",
      href
    );
    expect(
      screen.queryByRole("button", { name: "Continuar com AuthNEI" })
    ).toBeNull();
  }
);

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

test.each(["expired", "malformed"])(
  "does not restore an %s code entry",
  (state) => {
    const stored =
      state === "expired"
        ? `${Date.now() - 1}:example-invite`
        : `${Date.now() + 60_000}:example-invite:extra`;
    sessionStorage.setItem("fallstack-employee-invite", stored);
    sessionState.user = { role: "STUDENT" };

    render(<LoginCard initialView="employee" />);
    expect(
      screen.getByRole("button", { name: "Completar associação" })
    ).toHaveAttribute("data-initial-code", "");
    expect(sessionStorage.getItem("fallstack-employee-invite")).toBeNull();
  }
);

test("offers sign-in without a stored code when storage is blocked", () => {
  const setItem = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("Storage blocked");
    });
  try {
    render(<LoginCard initialView="employee" />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Código da Empresa" }),
      {
        target: { value: "example-invite" },
      }
    );
    const submit = screen.getByRole("button", {
      name: "Continuar com AuthNEI",
    });
    fireEvent.submit(submit.closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível guardar o código"
    );
    expect(
      document.querySelector("[data-next='/login?modal=employee']")
    ).not.toBeNull();
  } finally {
    setItem.mockRestore();
  }
});

test("interrupted sign-in starts a fresh request for the original destination", () => {
  render(
    <LoginCard
      signInFailure="auth-expired"
      signInDestination="/event/en?section=schedule"
    />
  );
  expect(
    screen.getByRole("link", { name: "Reiniciar início de sessão" })
  ).toHaveAttribute(
    "href",
    "/api/auth/login?next=%2Fevent%2Fen%3Fsection%3Dschedule"
  );
});

test("clears a pending invite code when the signed-out page is restored from browser history", () => {
  sessionStorage.setItem(
    "fallstack-employee-invite",
    `${Date.now() + 60_000}:example-invite`
  );
  render(<LoginCard initialView="employee" />);

  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: true });
  fireEvent(window, event);

  expect(sessionStorage.getItem("fallstack-employee-invite")).toBeNull();
});
