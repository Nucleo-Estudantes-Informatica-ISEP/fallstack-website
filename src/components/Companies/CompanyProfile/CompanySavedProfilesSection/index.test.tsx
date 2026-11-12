import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanySavedProfilesSection from ".";

const {
  scan,
  postMock,
  rawMock,
  getTokenMock,
  pushMock,
  refreshMock,
  toastErrorMock,
  toastWarningMock,
} = vi.hoisted(() => ({
  scan: { value: "ab12" },
  postMock: vi.fn(),
  rawMock: vi.fn(),
  getTokenMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastWarningMock: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: postMock, raw: rawMock },
  HttpClientError: class HttpClientError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
    }
  },
}));
vi.mock("@/client/api/studentToken", () => ({
  getStudentPreviewToken: getTokenMock,
}));
vi.mock("react-toastify", () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
    warning: toastWarningMock,
  },
}));
vi.mock("@/components/QRCode/QRCodeScanner", () => ({
  default: ({
    handleScan,
  }: {
    handleScan: (data: string) => Promise<void>;
  }) => <button onClick={() => void handleScan(scan.value)}>Scan QR</button>,
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyHistorySection", () => ({
  default: () => null,
}));

async function httpError(status: number, message = "Request failed") {
  const { HttpClientError } = await import("@/lib/http/client");
  return new (
    HttpClientError as unknown as new (message: string, status: number) => Error
  )(message, status);
}

const SAVED = [
  {
    studentId: "s1",
    createdAt: "2026-11-12T10:00:00.000Z",
    comment: null,
    student: { code: "Z101", name: "Beatriz Sintética" },
  },
] as SavedStudentDto[];

beforeEach(() => {
  vi.clearAllMocks();
  scan.value = "ab12";
  getTokenMock.mockResolvedValue("signed-preview-token");
  postMock.mockResolvedValue({});
});

function codeField() {
  return screen.getByLabelText("Código do estudante");
}

function typeCode(value: string) {
  fireEvent.change(codeField(), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Validar" }));
}

test("converts a Wallet student code before saving the scanned profile", async () => {
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() => {
    expect(getTokenMock).toHaveBeenCalledWith("AB12");
    expect(postMock).toHaveBeenCalledWith("/saved", {
      token: "signed-preview-token",
    });
    expect(pushMock).toHaveBeenCalledWith(
      "/student/signed-preview-token/preview"
    );
  });
  expect(toastErrorMock).not.toHaveBeenCalled();
});

test("continues to save a signed QR token without exchanging it", async () => {
  scan.value = "existing-jwt";
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() =>
    expect(postMock).toHaveBeenCalledWith("/saved", {
      token: "existing-jwt",
    })
  );
  expect(getTokenMock).not.toHaveBeenCalled();
});

test("rejects an unknown Wallet code without saving it as a JWT", async () => {
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "O código de estudante deste passe é inválido.",
      expect.anything()
    )
  );
  expect(postMock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Scan QR" })).toBeInTheDocument();
});

test("the code field has a visible label and a description", () => {
  render(<CompanySavedProfilesSection history={[]} />);

  expect(codeField()).toHaveAccessibleDescription(
    /Introduza o código associado ao QR Code/
  );
  expect(screen.getByText(/Sem câmara ou sem permissão/)).toBeInTheDocument();
});

test("an empty code shows one message, however many times Validar is pressed", async () => {
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Validar" }));
  await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Validar" }));
  await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(2));

  // Same toast id both times, so react-toastify shows a single toast.
  const ids = toastErrorMock.mock.calls.map(([, options]) => options.toastId);
  expect(ids[0]).toBe(ids[1]);
  expect(toastErrorMock).toHaveBeenCalledWith(
    "Sem código inserido.",
    expect.objectContaining({ toastId: expect.any(String) })
  );
  expect(getTokenMock).not.toHaveBeenCalled();
});

test("an unknown typed code is reported as invalid", async () => {
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("ZZZZ");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "O código introduzido é inválido.",
      expect.anything()
    )
  );
  expect(postMock).not.toHaveBeenCalled();
});

test("a malformed typed code is reported as invalid, not as a save failure", async () => {
  getTokenMock.mockRejectedValue(await httpError(400, "Invalid student code"));
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("ZZ");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "O código introduzido é inválido.",
      expect.anything()
    )
  );
});

test("too many typed attempts get a Portuguese rate-limit message", async () => {
  getTokenMock.mockRejectedValue(await httpError(429, "Too Many Requests"));
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("Z101");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Demasiadas tentativas. Aguarde um momento.",
      expect.anything()
    )
  );
  expect(postMock).not.toHaveBeenCalled();
});

test("a typed code saves the student and opens the saved preview", async () => {
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("Z104");

  await waitFor(() =>
    expect(pushMock).toHaveBeenCalledWith(
      "/student/signed-preview-token/preview"
    )
  );
  expect(getTokenMock).toHaveBeenCalledWith("Z104");
  expect(postMock).toHaveBeenCalledWith("/saved", {
    token: "signed-preview-token",
  });
  expect(refreshMock).toHaveBeenCalled();
});

test("a duplicate save is a warning and does not navigate", async () => {
  postMock.mockRejectedValue(await httpError(409, "Student already saved"));
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("Z101");

  await waitFor(() =>
    expect(toastWarningMock).toHaveBeenCalledWith(
      "Este estudante já foi guardado anteriormente.",
      expect.anything()
    )
  );
  expect(pushMock).not.toHaveBeenCalled();
});

test("other save failures show one Portuguese message instead of the server text", async () => {
  postMock.mockRejectedValue(await httpError(400, "Student already saved"));
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("Z101");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível guardar o perfil. Tenta novamente.",
      expect.anything()
    )
  );
  expect(toastErrorMock).not.toHaveBeenCalledWith(
    "Student already saved",
    expect.anything()
  );
  expect(pushMock).not.toHaveBeenCalled();
});

test("CV export is unavailable, with a reason, until something is saved", () => {
  render(<CompanySavedProfilesSection history={[]} />);

  const download = screen.getByRole("button", { name: "Download CVs" });
  expect(download).toBeDisabled();
  expect(download).toHaveAccessibleDescription(
    "Guarde perfis para poder exportar os CVs."
  );
});

test("a failed CV export shows a Portuguese message and re-enables the button", async () => {
  rawMock.mockRejectedValue(await httpError(500, "Internal Server Error"));
  render(<CompanySavedProfilesSection history={SAVED} />);

  fireEvent.click(screen.getByRole("button", { name: "Download CVs" }));

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível exportar os CVs. Tenta novamente.",
      expect.anything()
    )
  );
  expect(screen.getByRole("button", { name: "Download CVs" })).toBeEnabled();
});
