import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import FinalStep from ".";

const {
  pushMock,
  refreshMock,
  fetchSessionMock,
  toastErrorMock,
  createStudentProfileMock,
  getSessionMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  fetchSessionMock: vi.fn(),
  toastErrorMock: vi.fn(),
  createStudentProfileMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("react-toastify", () => ({
  toast: { error: toastErrorMock },
}));
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
vi.mock("@/client/api/auth", () => ({
  createStudentProfile: (...args: unknown[]) =>
    createStudentProfileMock(...args),
}));
vi.mock("@/client/api/upload", () => ({
  uploadAvatar: vi.fn(),
  uploadCv: vi.fn(),
}));

const data: StudentSignUpData = {
  name: "Jane Doe",
  email: "jane@isep.ipp.pt",
  password: "password123",
  bio: "Bio",
  interests: [],
  cv: null,
  avatar: null,
  year: "3",
  course: "Engenharia Informática",
  linkedin: null,
};

const renderFinalStep = (overrides: Partial<typeof data> = {}) =>
  render(
    <FinalStep
      currentStep={4}
      setCurrentStep={vi.fn()}
      data={{ ...data, ...overrides }}
      setData={vi.fn()}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

const acceptPrivacyAndSubmit = () => {
  for (const checkbox of screen.getAllByRole("checkbox"))
    fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: /concluir/i }));
};

test("creates the profile for a student session with no profile yet", async () => {
  getSessionMock.mockResolvedValue({ role: "STUDENT", student: null });
  createStudentProfileMock.mockResolvedValue(true);

  renderFinalStep();
  acceptPrivacyAndSubmit();

  await waitFor(() => expect(createStudentProfileMock).toHaveBeenCalled());

  expect(pushMock).toHaveBeenCalledWith("/");
});

test("does not submit a LinkedIn URL the profile editor would reject", async () => {
  getSessionMock.mockResolvedValue({ role: "STUDENT", student: null });

  renderFinalStep({ linkedin: "https://evil.example/in/user" });
  acceptPrivacyAndSubmit();

  expect(
    await screen.findByText("O teu Linkedin não segue o formato correto!")
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("textbox")).toHaveAttribute(
    "aria-describedby",
    "signup-linkedin-error"
  );
  for (const checkbox of screen.getAllByRole("checkbox")) {
    expect(checkbox).not.toHaveAttribute("aria-invalid");
    expect(checkbox).not.toHaveAttribute("aria-describedby");
  }
  expect(getSessionMock).not.toHaveBeenCalled();
  expect(createStudentProfileMock).not.toHaveBeenCalled();
});

test("redirects home when the profile already exists", async () => {
  getSessionMock.mockResolvedValue({
    role: "STUDENT",
    student: { code: "s1", name: "Jane" },
  });

  renderFinalStep();
  acceptPrivacyAndSubmit();

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));

  expect(createStudentProfileMock).not.toHaveBeenCalled();
});

test("blocks submission with a clear message for a non-student session", async () => {
  getSessionMock.mockResolvedValue({ role: "EMPLOYEE", student: null });

  renderFinalStep();
  acceptPrivacyAndSubmit();

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Já tens sessão iniciada como outro tipo de conta."
    )
  );

  expect(createStudentProfileMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("sends back to signup when there's no session (AuthNEI never established one)", async () => {
  getSessionMock.mockResolvedValue(null);

  renderFinalStep();
  acceptPrivacyAndSubmit();

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "A tua sessão expirou. Por favor, tenta novamente."
    )
  );

  expect(pushMock).toHaveBeenCalledWith("/signup");
  expect(createStudentProfileMock).not.toHaveBeenCalled();
});

test.each([
  "https://www.linkedin.com/in/example",
  "https://linkedin.com/in/example",
  "https://pt.linkedin.com/in/example",
])("sends valid LinkedIn address %s with the profile", async (linkedin) => {
  getSessionMock.mockResolvedValue({ role: "STUDENT", student: null });
  createStudentProfileMock.mockResolvedValue(true);

  renderFinalStep({ linkedin });
  acceptPrivacyAndSubmit();

  await waitFor(() =>
    expect(createStudentProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedin,
        privacyPolicyAccepted: true,
        termsAccepted: true,
      })
    )
  );
});

test("requires terms independently of privacy before any upload or request", async () => {
  renderFinalStep();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /política de privacidade/ })
  );
  fireEvent.click(screen.getByRole("button", { name: /concluir/i }));
  expect(
    await screen.findByText("Tens de aceitar os termos de utilização.")
  ).toBeInTheDocument();
  expect(getSessionMock).not.toHaveBeenCalled();
  expect(createStudentProfileMock).not.toHaveBeenCalled();
});
