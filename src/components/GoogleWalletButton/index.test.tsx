import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { HttpClientError } from "@/lib/http/client";

import GoogleWalletButton from ".";

const { getSaveUrlMock, getAvailabilityMock, toastErrorMock } = vi.hoisted(
  () => ({
    getSaveUrlMock: vi.fn(),
    getAvailabilityMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
);

vi.mock("client-only", () => ({}));
vi.mock("@/client/api/wallet", () => ({
  getGoogleWalletSaveUrl: getSaveUrlMock,
  getGoogleWalletAvailability: getAvailabilityMock,
}));
vi.mock("react-toastify", () => ({
  toast: { error: toastErrorMock },
}));

beforeEach(() => {
  getSaveUrlMock.mockReset();
  getAvailabilityMock.mockReset();
  getAvailabilityMock.mockResolvedValue({ enabled: true });
  toastErrorMock.mockReset();
});

afterEach(() => vi.restoreAllMocks());

test("hides the button when the server has not enabled Wallet", async () => {
  getAvailabilityMock.mockResolvedValue({ enabled: false });
  render(<GoogleWalletButton />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(getAvailabilityMock).toHaveBeenCalled();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("hides the button on iOS", async () => {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("iPhone");
  render(<GoogleWalletButton />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(getAvailabilityMock).toHaveBeenCalled();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("opens the signed Google Wallet save URL returned by the server", async () => {
  const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
  getSaveUrlMock.mockResolvedValue({
    url: "https://pay.google.com/gp/v/save/signed-jwt",
  });

  render(<GoogleWalletButton />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Adicionar à Carteira da Google",
    })
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
  const button = await screen.findByRole("button", {
    name: "Adicionar à Carteira da Google",
  });
  fireEvent.click(button);

  await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
  expect(button).not.toBeDisabled();
});

test("shows a Portuguese fallback for server errors", async () => {
  getSaveUrlMock.mockRejectedValue(
    new HttpClientError("Google Wallet credentials are invalid", 503)
  );

  render(<GoogleWalletButton />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Adicionar à Carteira da Google",
    })
  );

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível adicionar o passe à Carteira da Google."
    )
  );
});
