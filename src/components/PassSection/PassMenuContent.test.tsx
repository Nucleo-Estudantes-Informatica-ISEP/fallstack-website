import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as offlinePassModule from "./generateOfflinePass";
import PassMenuContent from "./PassMenuContent";

vi.mock("@/lib/http/client", () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: "mock-jwt-token" }),
  },
}));

vi.mock("@/components/GoogleWalletButton", () => ({
  default: () => <button type="button">Mock Google Wallet</button>,
}));

describe("PassMenuContent", () => {
  const mockStudent = {
    code: "AB12CD",
    name: "Hugo Silva",
    user: {
      email: "hugo@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pass details and download button for students with a code", async () => {
    render(<PassMenuContent student={mockStudent} />);

    expect(screen.getByText("Passe do FallStack")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Descarregar Passe (Offline)" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("AB12CD").length).toBeGreaterThan(0);
  });

  it("handles successful offline pass download", async () => {
    const downloadSpy = vi
      .spyOn(offlinePassModule, "downloadOfflinePass")
      .mockResolvedValue();

    render(<PassMenuContent student={mockStudent} />);

    const downloadButton = screen.getByRole("button", {
      name: "Descarregar Passe (Offline)",
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          studentName: "Hugo Silva",
          studentEmail: "hugo@example.com",
          permanentCode: "AB12CD",
        })
      );
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(downloadButton).not.toBeDisabled();
  });

  it("displays error alert when download fails and allows retry", async () => {
    const downloadSpy = vi
      .spyOn(offlinePassModule, "downloadOfflinePass")
      .mockRejectedValueOnce(new Error("Canvas failure"))
      .mockResolvedValueOnce();

    render(<PassMenuContent student={mockStudent} />);

    const downloadButton = screen.getByRole("button", {
      name: "Descarregar Passe (Offline)",
    });

    // 1st attempt: fails
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível gerar o passe offline. Tenta novamente antes de ficares sem internet."
      );
    });

    // Button recovers after failure
    expect(downloadButton).toBeEnabled();
    expect(downloadButton).toHaveTextContent("Descarregar Passe (Offline)");

    // 2nd attempt (retry): succeeds
    fireEvent.click(downloadButton);

    // During generation or after, previous error is cleared
    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    expect(downloadButton).toBeEnabled();
  });
});
