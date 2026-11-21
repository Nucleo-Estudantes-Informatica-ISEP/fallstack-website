import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { httpClient, HttpClientError } from "@/lib/http/client";
import { getStudentPreview } from "@/client/api/studentToken";

import CompanyTab from ".";

const mocks = vi.hoisted(() => ({
  isMobile: false,
  push: vi.fn(),
  toast: { error: vi.fn(), warning: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => mocks.isMobile }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
vi.mock("@/components/QRCode/QRCodeTab/ScanTab", () => ({
  default: () => <div data-testid="scanner">Scanner</div>,
}));
vi.mock("@/client/api/studentToken", () => ({
  getStudentPreview: vi.fn(),
}));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { post: vi.fn() },
}));

const codeInput = () => screen.getByRole("textbox");
const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Ir para o perfil" }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isMobile = false;
});

test("desktop shows only the typed-code entry", () => {
  render(<CompanyTab setHidden={vi.fn()} />);

  expect(screen.queryByTestId("scanner")).toBeNull();
  expect(codeInput()).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Ir para o perfil" })
  ).toBeInTheDocument();
});

test("mobile shows the scanner with the typed-code entry below it", () => {
  mocks.isMobile = true;
  render(<CompanyTab setHidden={vi.fn()} />);

  const scanner = screen.getByTestId("scanner");
  expect(
    scanner.compareDocumentPosition(codeInput()) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

test.each([
  ["a six-character code", "AB12CD", "AB12CD"],
  ["a legacy four-character code", "AB12", "AB12"],
  ["lower case with spaces", "  ab12cd ", "AB12CD"],
])(
  "typing %s saves the student and opens the preview",
  async (_label, typed, expectedCode) => {
    const setHidden = vi.fn();
    vi.mocked(getStudentPreview).mockResolvedValue({
      code: "AB12",
      token: "preview-token",
    });
    vi.mocked(httpClient.post).mockResolvedValue(undefined);
    render(<CompanyTab setHidden={setHidden} />);

    fireEvent.change(codeInput(), { target: { value: typed } });
    submit();

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/student/AB12/preview")
    );
    expect(getStudentPreview).toHaveBeenCalledWith(expectedCode);
    expect(httpClient.post).toHaveBeenCalledWith("/saved", {
      token: "preview-token",
    });
    expect(setHidden).toHaveBeenCalledWith(true);
  }
);

test("Enter submits like the button", async () => {
  vi.mocked(getStudentPreview).mockResolvedValue({
    code: "AB12",
    token: "preview-token",
  });
  vi.mocked(httpClient.post).mockResolvedValue(undefined);
  render(<CompanyTab setHidden={vi.fn()} />);

  fireEvent.change(codeInput(), { target: { value: "AB12CD" } });
  fireEvent.keyUp(codeInput(), { key: "Enter" });

  await waitFor(() => expect(getStudentPreview).toHaveBeenCalledWith("AB12CD"));
});

test.each(["AB1", "AB12C", "AB12CD7", "AB-2CD"])(
  "rejects %s as invalid without asking the server",
  async (typed) => {
    // Without maxLength the field accepts any length; the server would answer
    // 400 and the company user would only see a generic error.
    render(<CompanyTab setHidden={vi.fn()} />);

    fireEvent.change(codeInput(), { target: { value: typed } });
    submit();

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        "O código introduzido é inválido."
      )
    );
    expect(getStudentPreview).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  }
);

test("an unknown code is reported as invalid", async () => {
  vi.mocked(getStudentPreview).mockResolvedValue(null);
  render(<CompanyTab setHidden={vi.fn()} />);

  fireEvent.change(codeInput(), { target: { value: "ZZ99ZZ" } });
  submit();

  await waitFor(() =>
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "O código introduzido é inválido."
    )
  );
  expect(httpClient.post).not.toHaveBeenCalled();
});

test("an already saved student shows a warning and stays on the tab", async () => {
  vi.mocked(getStudentPreview).mockResolvedValue({
    code: "AB12",
    token: "preview-token",
  });
  vi.mocked(httpClient.post).mockRejectedValue(
    new HttpClientError("Conflict", 409)
  );
  render(<CompanyTab setHidden={vi.fn()} />);

  fireEvent.change(codeInput(), { target: { value: "AB12CD" } });
  submit();

  await waitFor(() =>
    expect(mocks.toast.warning).toHaveBeenCalledWith(
      "Este estudante já foi guardado anteriormente."
    )
  );
  expect(mocks.push).not.toHaveBeenCalled();
});

test("an empty field asks for a code", async () => {
  render(<CompanyTab setHidden={vi.fn()} />);

  submit();

  await waitFor(() =>
    expect(mocks.toast.error).toHaveBeenCalledWith("Sem código inserido.")
  );
  expect(getStudentPreview).not.toHaveBeenCalled();
});
