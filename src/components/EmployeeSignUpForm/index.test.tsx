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
};

test("submits the entered fields and calls onSuccess", async () => {
  signUpEmployeeMock.mockResolvedValue(true);
  const onSuccess = vi.fn();

  render(<EmployeeSignUpForm onSuccess={onSuccess} />);
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Registar" }));

  await waitFor(() =>
    expect(signUpEmployeeMock).toHaveBeenCalledWith({
      email: "jane@company.com",
      password: "password123",
      name: "Jane Doe",
      linkedin: "",
      companyCode: "12345678",
    })
  );
  expect(toastSuccessMock).toHaveBeenCalledWith(
    "Registo efetuado com sucesso."
  );
  expect(onSuccess).toHaveBeenCalled();
});

test("does not submit when the form is invoked while canSubmit is false", () => {
  render(<EmployeeSignUpForm />);

  fireEvent.submit(
    screen.getByRole("button", { name: "Registar" }).closest("form")!
  );

  expect(signUpEmployeeMock).not.toHaveBeenCalled();
});

test("shows a validation message for a malformed company code and disables submit", () => {
  render(<EmployeeSignUpForm />);

  fireEvent.change(screen.getByLabelText("Código da Empresa (8 dígitos)"), {
    target: { value: "123" },
  });

  expect(
    screen.getByText("Tem de ter exatamente 8 dígitos numéricos.")
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registar" })).toBeDisabled();
});

test("shows the API error and doesn't call onSuccess when signup fails", async () => {
  signUpEmployeeMock.mockResolvedValue(new Error("Company code not found."));
  const onSuccess = vi.fn();

  render(<EmployeeSignUpForm onSuccess={onSuccess} />);
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Registar" }));

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith("Company code not found.")
  );
  expect(onSuccess).not.toHaveBeenCalled();
});
