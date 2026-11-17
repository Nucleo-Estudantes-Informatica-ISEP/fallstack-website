import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-toastify";
import { beforeEach, expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import { getStudentPreviewToken } from "@/client/api/studentToken";

import ScanTab from ".";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: vi.fn() },
  HttpClientError: class extends Error {},
}));
vi.mock("@/client/api/studentToken", () => ({
  getStudentPreviewToken: vi.fn(),
}));
vi.mock("@/components/QRCode/QRCodeScanner", () => ({
  default: ({ handleScan }: { handleScan: (s: string) => void }) => (
    <button onClick={() => handleScan("signed-attendance-token")}>
      Scan test
    </button>
  ),
}));
beforeEach(() => vi.clearAllMocks());
test("validates the live QR before saving and opening its preview", async () => {
  vi.mocked(getStudentPreviewToken).mockResolvedValue("student-preview");
  render(<ScanTab setHidden={vi.fn()} />);
  fireEvent.click(screen.getByText("Scan test"));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/student/student-preview/preview")
  );
  expect(getStudentPreviewToken).toHaveBeenCalledWith({
    token: "signed-attendance-token",
  });
  expect(httpClient.post).toHaveBeenCalledWith("/saved", {
    token: "student-preview",
  });
});
test("rejects an invalid or expired pass without saving or opening a profile", async () => {
  vi.mocked(getStudentPreviewToken).mockResolvedValue(null);
  render(<ScanTab setHidden={vi.fn()} />);
  fireEvent.click(screen.getByText("Scan test"));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(httpClient.post).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});
