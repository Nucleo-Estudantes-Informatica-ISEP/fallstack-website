import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import GoogleWalletButton from ".";

const { getSaveUrlMock, toastErrorMock } = vi.hoisted(() => ({
  getSaveUrlMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/client/api/wallet", () => ({
  getGoogleWalletSaveUrl: getSaveUrlMock,
}));
vi.mock("react-toastify", () => ({
  toast: { error: toastErrorMock },
}));

beforeEach(() => {
  getSaveUrlMock.mockReset();
  toastErrorMock.mockReset();
});

test("opens the signed Google Wallet save URL returned by the server", async () => {
  const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
  getSaveUrlMock.mockResolvedValue({
    url: "https://pay.google.com/gp/v/save/signed-jwt",
  });

  render(<GoogleWalletButton />);
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar ao Google Wallet" })
  );

  await waitFor(() =>
    expect(openMock).toHaveBeenCalledWith(
      "https://pay.google.com/gp/v/save/signed-jwt",
      "_self"
    )
  );
});

test("shows an error and leaves the button usable when pass creation fails", async () => {
  getSaveUrlMock.mockRejectedValue(new Error("Wallet unavailable"));

  render(<GoogleWalletButton />);
  const button = screen.getByRole("button", {
    name: "Adicionar ao Google Wallet",
  });
  fireEvent.click(button);

  await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
  expect(button).not.toBeDisabled();
});
