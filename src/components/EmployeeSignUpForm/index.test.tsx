import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import EmployeeSignUpForm from ".";

const { signUpEmployeeMock, toastSuccessMock, toastErrorMock } = vi.hoisted(
  () => ({
    signUpEmployeeMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
);

vi.mock("react-toastify", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));
vi.mock("@/client/api/auth", () => ({
  signUpEmployee: (...args: unknown[]) => signUpEmployeeMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Jane Doe" },
  });
  fireEvent.change(screen.getByLabelText("LinkedIn (opcional)"), {
    target: { value: "https://linkedin.com/in/jane" },
  });
  fireEvent.change(screen.getByLabelText("Código da Empresa"), {
    target: { value: "fs_emp_1234567890" },
  });
};

test("submits profile data and the company invite code", async () => {
  signUpEmployeeMock.mockResolvedValue(true);
  const onSuccess = vi.fn();

  render(<EmployeeSignUpForm onSuccess={onSuccess} />);
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Associar à empresa" }));

  await waitFor(() =>
    expect(signUpEmployeeMock).toHaveBeenCalledWith({
      name: "Jane Doe",
      linkedin: "https://linkedin.com/in/jane",
      companyCode: "fs_emp_1234567890",
    })
  );
  expect(toastSuccessMock).toHaveBeenCalledWith(
    "Conta associada à empresa com sucesso."
  );
  expect(onSuccess).toHaveBeenCalled();
});

test("does not collect email or password because AuthNEI already owns identity", () => {
  render(<EmployeeSignUpForm />);

  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});

test("rejects a malformed company code", () => {
  render(<EmployeeSignUpForm />);

  fireEvent.change(screen.getByLabelText("Código da Empresa"), {
    target: { value: "bad!" },
  });

  expect(screen.getByText("Código de empresa inválido.")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Associar à empresa" })
  ).toBeDisabled();
});

test("shows the API error and does not complete onboarding on failure", async () => {
  signUpEmployeeMock.mockResolvedValue(new Error("Invalid company code"));
  const onSuccess = vi.fn();

  render(<EmployeeSignUpForm onSuccess={onSuccess} />);
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Associar à empresa" }));

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith("Invalid company code")
  );
  expect(onSuccess).not.toHaveBeenCalled();
});
