import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import CompanySavedProfilesSection from ".";

const { scan, postMock, getTokenMock, pushMock, refreshMock, toastErrorMock } =
  vi.hoisted(() => ({
    scan: { value: "ab12" },
    postMock: vi.fn(),
    getTokenMock: vi.fn(),
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: postMock },
  HttpClientError: class HttpClientError extends Error {},
}));
vi.mock("@/client/api/studentToken", () => ({
  getStudentPreviewToken: getTokenMock,
}));
vi.mock("react-toastify", () => ({
  toast: { error: toastErrorMock, success: vi.fn(), warning: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
  scan.value = "ab12";
  getTokenMock.mockResolvedValue("signed-preview-token");
  postMock.mockResolvedValue({});
});

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
      "O código de estudante deste passe é inválido."
    )
  );
  expect(postMock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Scan QR" })).toBeInTheDocument();
});
