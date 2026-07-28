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
  linkedin: null,
};

const renderFinalStep = () =>
  render(
    <FinalStep
      currentStep={4}
      setCurrentStep={vi.fn()}
      data={data}
      setData={vi.fn()}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

const acceptPrivacyAndSubmit = () => {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "CONCLUIR" }));
};

test("creates the profile for a student session with no profile yet", async () => {
  getSessionMock.mockResolvedValue({ role: "STUDENT", student: null });
  createStudentProfileMock.mockResolvedValue(true);

  renderFinalStep();
  acceptPrivacyAndSubmit();

  await waitFor(() => expect(createStudentProfileMock).toHaveBeenCalled());

  expect(pushMock).toHaveBeenCalledWith("/");
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
