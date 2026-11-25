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
  getStudentPreview: getTokenMock,
}));
vi.mock("react-toastify", () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
    warning: toastWarningMock,
  },
}));
const CAMERA_ERROR =
  "Não foi possível aceder à câmara. Confirma permissão e tenta novamente.";

vi.mock("@/components/QRCode/QRCodeScanner", () => ({
  default: ({
    handleScan,
    onMessage,
  }: {
    handleScan: (data: string) => Promise<void>;
    onMessage?: (message: string) => void;
  }) => (
    <>
      <button onClick={() => void handleScan(scan.value)}>Scan QR</button>
      <button onClick={() => onMessage?.(CAMERA_ERROR)}>Camera fails</button>
    </>
  ),
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
  getTokenMock.mockResolvedValue({
    code: "AB12",
    token: "signed-preview-token",
  });
  postMock.mockResolvedValue({});
});

function codeField() {
  return screen.getByLabelText("Código do estudante");
}

function messageArea() {
  return screen.getByRole("alert");
}

function typeCode(value: string) {
  fireEvent.change(codeField(), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Validar" }));
}

// ADR 0022: legacy four-character and new six-character codes both work.
test.each([
  ["four", "ab12", "AB12"],
  ["six", "ab12cd", "AB12CD"],
])(
  "converts a %s-character Wallet student code before saving the scanned profile",
  async (_, scanned, code) => {
    scan.value = scanned;
    render(<CompanySavedProfilesSection history={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

    await waitFor(() => {
      expect(getTokenMock).toHaveBeenCalledWith(code);
      expect(postMock).toHaveBeenCalledWith("/saved", {
        token: "signed-preview-token",
      });
      expect(pushMock).toHaveBeenCalledWith("/student/AB12/preview");
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  }
);

test("exchanges a signed live QR before saving and opening the preview", async () => {
  scan.value = "existing-jwt";
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() =>
    expect(postMock).toHaveBeenCalledWith("/saved", {
      token: "signed-preview-token",
    })
  );
  expect(getTokenMock).toHaveBeenCalledWith({ token: "existing-jwt" });
  expect(pushMock).toHaveBeenCalledWith("/student/AB12/preview");
});

test("rejects an unknown Wallet code without saving it as a JWT", async () => {
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() =>
    expect(messageArea()).toHaveTextContent(
      "O código de estudante deste passe é inválido."
    )
  );
  expect(postMock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Scan QR" })).toBeInTheDocument();
});

// A toast can land over the live preview or the controls wherever the page
// is scrolled, so camera, scan and typed-code messages show in the page, in
// one place under the camera box and above the code field.
function expectMessageUnderCamera(text: string) {
  const alert = messageArea();
  const camera = screen.getByRole("group", {
    name: "Câmara do leitor de QR Code",
  });
  expect(alert).toHaveTextContent(text);
  expect(camera).not.toContainElement(alert);
  expect(
    camera.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(
    alert.compareDocumentPosition(codeField()) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(toastErrorMock).not.toHaveBeenCalled();
  expect(toastWarningMock).not.toHaveBeenCalled();
}

test("a camera error shows under the camera box, not as a toast", () => {
  render(<CompanySavedProfilesSection history={[]} />);
  expect(messageArea()).toBeEmptyDOMElement();

  fireEvent.click(screen.getByRole("button", { name: "Camera fails" }));

  expectMessageUnderCamera(CAMERA_ERROR);
});

test.each([
  [
    "an unknown Wallet code",
    () => getTokenMock.mockResolvedValue(null),
    "O código de estudante deste passe é inválido.",
  ],
  [
    "a lookup failure",
    () => getTokenMock.mockRejectedValue(new Error("offline")),
    "Ocorreu um erro a dar scan no QR Code do estudante...",
  ],
  [
    "an already-saved student",
    async () =>
      postMock.mockRejectedValue(await httpError(409, "Student already saved")),
    "Este estudante já foi guardado anteriormente.",
  ],
  [
    "an admin's repeat save",
    async () =>
      postMock.mockRejectedValue(await httpError(400, "Student already saved")),
    "Este estudante já foi guardado anteriormente.",
  ],
  [
    "a failed save",
    async () => postMock.mockRejectedValue(await httpError(500)),
    "Não foi possível guardar o perfil. Tenta novamente.",
  ],
])(
  "%s from a scan shows under the camera box, not as a toast",
  async (_, arrange, text) => {
    await arrange();
    render(<CompanySavedProfilesSection history={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

    await waitFor(() => expect(messageArea()).toHaveTextContent(text));
    expectMessageUnderCamera(text);
    expect(pushMock).not.toHaveBeenCalled();
  }
);

test("reading the same failing code again suppresses repeated lookups", async () => {
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));
  const message = await screen.findByText(/inválido/);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));
  // Suppressed: does not call getStudentPreview again while the same code is in view.
  expect(message).toBeInTheDocument();
  expect(getTokenMock).toHaveBeenCalledTimes(1);
});

test("a failure followed by a different valid scan processes successfully", async () => {
  getTokenMock.mockResolvedValueOnce(null);
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));
  await waitFor(() => expect(messageArea()).toHaveTextContent(/inválido/));
  expect(getTokenMock).toHaveBeenCalledTimes(1);

  // Present a different valid code to the camera
  scan.value = "cd34";
  getTokenMock.mockResolvedValueOnce({
    code: "CD34",
    token: "signed-preview-token-cd34",
  });
  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() =>
    expect(pushMock).toHaveBeenCalledWith("/student/CD34/preview")
  );
  expect(getTokenMock).toHaveBeenCalledTimes(2);
  expect(messageArea()).toBeEmptyDOMElement();
});

// The camera coming back would read the same code again before the page
// changes, and that second save would flash "already saved".
test.each([
  ["a saved student", () => "ab12"],
  ["a link to this site", () => `${window.location.origin}/student/x/preview`],
])(
  "after %s, the camera stays off until the page changes",
  async (_, scanned) => {
    scan.value = scanned();
    render(<CompanySavedProfilesSection history={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("status")).toHaveTextContent("A processar...");
    expect(
      screen.queryByRole("button", { name: "Scan QR" })
    ).not.toBeInTheDocument();
    expect(messageArea()).toBeEmptyDOMElement();
  }
);

test("the code field has a visible label and a description", () => {
  render(<CompanySavedProfilesSection history={[]} />);

  expect(codeField()).toHaveAccessibleDescription(
    /Introduza o código associado ao QR Code/
  );
  expect(screen.getByText(/Sem câmara ou sem permissão/)).toBeInTheDocument();
});

test("the camera box is named for screen readers", () => {
  render(<CompanySavedProfilesSection history={[]} />);

  expect(
    screen.getByRole("group", { name: "Câmara do leitor de QR Code" })
  ).toContainElement(screen.getByRole("button", { name: "Scan QR" }));
});

test("keyboard focus keeps the code field and buttons clear of the fixed top bar", () => {
  render(<CompanySavedProfilesSection history={SAVED} />);

  for (const control of [
    codeField(),
    screen.getByRole("button", { name: "Validar" }),
    screen.getByRole("button", { name: "Download CVs" }),
  ])
    expect(control).toHaveClass("field-focus-target");
});

test("an empty code shows one message, however many times Validar is pressed", async () => {
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Validar" }));
  await waitFor(() => expectMessageUnderCamera("Sem código inserido."));
  fireEvent.click(screen.getByRole("button", { name: "Validar" }));

  await waitFor(() => expect(codeField()).toHaveFocus());
  expect(screen.getAllByText("Sem código inserido.")).toHaveLength(1);
  expect(getTokenMock).not.toHaveBeenCalled();
});

test.each([
  [
    "an unknown code",
    () => getTokenMock.mockResolvedValue(null),
    "O código introduzido é inválido.",
  ],
  [
    "a malformed code",
    async () =>
      getTokenMock.mockRejectedValue(
        await httpError(400, "Invalid student code")
      ),
    "O código introduzido é inválido.",
  ],
  [
    "too many attempts",
    async () =>
      getTokenMock.mockRejectedValue(await httpError(429, "Too Many Requests")),
    "Demasiadas tentativas. Aguarde um momento.",
  ],
  [
    "a lookup failure",
    async () =>
      getTokenMock.mockRejectedValue(
        await httpError(500, "Internal Server Error")
      ),
    "Não foi possível guardar o perfil. Tenta novamente.",
  ],
])(
  "%s, when typed, is reported under the camera box and saves nothing",
  async (_, arrange, text) => {
    await arrange();
    render(<CompanySavedProfilesSection history={[]} />);

    typeCode("Z101");

    await waitFor(() => expect(messageArea()).toHaveTextContent(text));
    expectMessageUnderCamera(text);
    expect(postMock).not.toHaveBeenCalled();
  }
);

test.each([
  ["four", "Z104", "Z104"],
  ["six", " ab12cd ", "AB12CD"],
])(
  "a typed %s-character code saves the student and opens the saved preview",
  async (_, typed, code) => {
    render(<CompanySavedProfilesSection history={[]} />);

    typeCode(typed);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/student/AB12/preview")
    );
    expect(getTokenMock).toHaveBeenCalledWith(code);
    expect(postMock).toHaveBeenCalledWith("/saved", {
      token: "signed-preview-token",
    });
    expect(refreshMock).toHaveBeenCalled();
  }
);

test.each(["ABC", "ABCDEFG", "AB!2"])(
  "rejects malformed code %s without a request",
  async (code) => {
    render(<CompanySavedProfilesSection history={[]} />);
    typeCode(code);
    await waitFor(() =>
      expect(messageArea()).toHaveTextContent(
        "O código introduzido é inválido."
      )
    );
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(postMock).not.toHaveBeenCalled();
  }
);

// 409 from the duplicate check; 400 "Student already saved" when an admin
// employee, who skips that check, hits the one-save-per-company rule.
test.each([409, 400])(
  "a typed already-saved student (%i) is a warning and does not navigate",
  async (status) => {
    postMock.mockRejectedValue(
      await httpError(status, "Student already saved")
    );
    render(<CompanySavedProfilesSection history={[]} />);

    typeCode("A123");

    await waitFor(() =>
      expect(messageArea()).toHaveTextContent(
        "Este estudante já foi guardado anteriormente."
      )
    );
    expectMessageUnderCamera("Este estudante já foi guardado anteriormente.");
    expect(pushMock).not.toHaveBeenCalled();
  }
);

test.each([
  ["an invalid", () => getTokenMock.mockResolvedValue(null)],
  [
    "a duplicate",
    async () =>
      postMock.mockRejectedValue(await httpError(409, "Student already saved")),
  ],
])(
  "after %s code, keyboard focus returns to the code field",
  async (_, arrange) => {
    await arrange();
    render(<CompanySavedProfilesSection history={[]} />);

    // The field and button are disabled while the code is checked, which in
    // a browser drops keyboard focus to the page body.
    typeCode("Z101");
    expect(screen.getByRole("button", { name: "A validar..." })).toBeDisabled();
    expect(document.body).toHaveFocus();

    await waitFor(() => expect(codeField()).toHaveFocus());
  }
);

test.each([
  ["a server error", 500, "Internal Server Error"],
  ["a bad token", 400, "Invalid token"],
])(
  "%s on save shows one Portuguese message instead of the server text",
  async (_, status, serverText) => {
    postMock.mockRejectedValue(await httpError(status, serverText));
    render(<CompanySavedProfilesSection history={[]} />);

    typeCode("Z101");

    await waitFor(() =>
      expect(messageArea()).toHaveTextContent(
        "Não foi possível guardar o perfil. Tenta novamente."
      )
    );
    expect(screen.queryByText(serverText)).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  }
);

test("a typed-code message is scrolled into view without taking focus", async () => {
  // jsdom has no layout, so stand in for the browser's scrolling.
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  typeCode("ZZZZ");

  await waitFor(() => expect(messageArea()).toHaveTextContent(/inválido/));
  expect(scrollIntoView.mock.contexts).toContain(messageArea());
  expect(scrollIntoView).toHaveBeenCalledWith({
    block: "nearest",
    behavior: "instant",
  });
  await waitFor(() => expect(codeField()).toHaveFocus());
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

test("a typed code's message replaces an earlier scan message", async () => {
  getTokenMock.mockResolvedValueOnce(null);
  render(<CompanySavedProfilesSection history={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));
  await waitFor(() => expect(messageArea()).toHaveTextContent(/passe/));

  getTokenMock.mockResolvedValueOnce(null);
  typeCode("ZZZZ");

  await waitFor(() =>
    expect(messageArea()).toHaveTextContent("O código introduzido é inválido.")
  );
  expect(messageArea()).not.toHaveTextContent(/passe/);
});

test("a scan message does not scroll the page away from the camera", async () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));

  await waitFor(() => expect(messageArea()).toHaveTextContent(/passe/));
  expect(scrollIntoView).not.toHaveBeenCalled();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
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

test("rejects an expired signed QR without saving a profile", async () => {
  scan.value = "expired-attendance-token";
  getTokenMock.mockResolvedValue(null);
  render(<CompanySavedProfilesSection history={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Scan QR" }));
  await waitFor(() =>
    expect(getTokenMock).toHaveBeenCalledWith({
      token: "expired-attendance-token",
    })
  );
  await waitFor(() =>
    expect(messageArea()).toHaveTextContent(
      "Passe inválido ou expirado. Atualiza o QR Code e tenta novamente."
    )
  );
  expect(postMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});
