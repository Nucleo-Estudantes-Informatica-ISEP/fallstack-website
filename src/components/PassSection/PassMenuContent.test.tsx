import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import StyledPassCard from "@/components/PassSection/StyledPassCard";

import PassMenuContent from "./PassMenuContent";

vi.mock("@/lib/http/client", () => ({ httpClient: { get: vi.fn() } }));
vi.mock("@/components/PassSection/StyledPassCard", () => ({
  default: vi.fn(() => <p>Pass card</p>),
}));
vi.mock("@/components/GoogleWalletButton", () => ({
  default: () => <p>Google Wallet button</p>,
}));

const student = { code: "Z100", name: "Carolina Referência" };
const writeText = vi.fn().mockResolvedValue(undefined);

const lastCardProps = () => vi.mocked(StyledPassCard).mock.lastCall?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test("requests a fresh QR token and passes it to the card with the name and code", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });

  render(<PassMenuContent student={student} />);

  expect(lastCardProps()).toEqual({
    name: "Carolina Referência",
    qrValue: null,
    loading: true,
    code: "Z100",
  });
  await waitFor(() =>
    expect(lastCardProps()).toEqual({
      name: "Carolina Referência",
      qrValue: "signed-token",
      loading: false,
      code: "Z100",
    })
  );
  expect(httpClient.get).toHaveBeenCalledWith("/qrcode", {
    cache: "no-store",
  });
});

test("a failed QR request leaves the card without a QR and stops loading", async () => {
  vi.mocked(httpClient.get).mockRejectedValue(new Error("network"));

  render(<PassMenuContent student={student} />);

  await waitFor(() =>
    expect(lastCardProps()).toEqual({
      name: "Carolina Referência",
      qrValue: null,
      loading: false,
      code: "Z100",
    })
  );
});

test("the code button copies the student code and shows Copiado!", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: /Z100/ }));

  expect(writeText).toHaveBeenCalledWith("Z100");
  expect(screen.getByText("Copiado!")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.queryByText("Copiado!")).toBeNull();
});

test("shows the Google Wallet button", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  expect(screen.getByText("Google Wallet button")).toBeInTheDocument();
});
