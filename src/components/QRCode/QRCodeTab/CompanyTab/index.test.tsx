import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import CompanyTab from ".";

const { getTokenMock, postMock, pushMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  postMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => false }));
vi.mock("@/components/QRCode/QRCodeTab/ScanTab", () => ({
  default: () => null,
}));
vi.mock("@/client/api/studentToken", () => ({
  getStudentPreviewToken: getTokenMock,
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { post: postMock },
  HttpClientError: class HttpClientError extends Error {},
}));
vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), warning: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  getTokenMock.mockResolvedValue("signed-preview-token");
  postMock.mockResolvedValue({});
});

// ADR 0022: legacy four-character and new six-character codes both work.
test.each(["AB12", "AB12CD"])(
  "a typed %s code is looked up and saved",
  async (code) => {
    render(<CompanyTab setHidden={vi.fn()} />);
    const field = screen.getByRole("textbox");

    // The field fits the longest code, so a six-character code is not cut short.
    expect(field).toHaveAttribute("maxLength", "6");
    fireEvent.change(field, { target: { value: code } });
    fireEvent.click(screen.getByRole("button", { name: "Ir para o perfil" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        "/student/signed-preview-token/preview"
      )
    );
    expect(getTokenMock).toHaveBeenCalledWith(code);
    expect(postMock).toHaveBeenCalledWith("/saved", {
      token: "signed-preview-token",
    });
  }
);
