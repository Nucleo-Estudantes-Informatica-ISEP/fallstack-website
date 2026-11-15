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

test("has the section heading and the Figma intro sentence", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  const heading = screen.getByRole("heading", { name: "Passe do FallStack" });
  expect(heading.tagName).toBe("H2");
  expect(heading).not.toHaveAttribute("style");
  expect(heading).toHaveClass(
    "font-sans",
    "font-semibold",
    "text-2xl",
    "lg:text-[1.75rem]",
    "text-center",
    "lg:text-left"
  );
  expect(
    screen.getByText(
      "Passa o teu passe na entrada para as palestras, junto a um elemento do staff para ficares registado para os vários giveaways que o NEI irá fazer!"
    )
  ).toBeInTheDocument();
  expect(screen.queryByText(/Apresenta este passe às empresas/)).toBeNull();
});

test("shows the code under its label, with a labelled copy button", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  expect(screen.getByText("O teu passe tem o código:")).toBeInTheDocument();
  expect(screen.getByText("Z100")).toHaveClass("font-mono");
  const copy = screen.getByRole("button", { name: "Copiar o código Z100" });
  expect(copy).toHaveAttribute("type", "button");
  expect(copy).toHaveClass("ui-focus");
});

test("announces Copiado! to screen readers", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  const status = screen.getByRole("status");
  expect(status).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole("button", { name: "Copiar o código Z100" }));
  expect(status).toHaveTextContent("Copiado!");
});

test("a failed QR request explains itself and retries the same request", async () => {
  vi.mocked(httpClient.get)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce({ data: "signed-token" });
  render(<PassMenuContent student={student} />);

  expect(
    await screen.findByText("Não foi possível carregar o QR Code.")
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

  await waitFor(() => expect(lastCardProps()?.qrValue).toBe("signed-token"));
  expect(httpClient.get).toHaveBeenCalledTimes(2);
  expect(httpClient.get).toHaveBeenLastCalledWith("/qrcode", {
    cache: "no-store",
  });
  expect(screen.queryByText("Não foi possível carregar o QR Code.")).toBeNull();
});

test("no error line while the QR is loading or after it loads", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  render(<PassMenuContent student={student} />);

  expect(screen.queryByText("Não foi possível carregar o QR Code.")).toBeNull();
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
});

test("a six-character code and a 60-character name keep the card props and wrap", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  const long = {
    code: "Y4Q7K2",
    name: "Maria Sintética da Conceição Albuquerque Vasconcelos Pereira",
  };
  render(<PassMenuContent student={long} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  expect(lastCardProps()).toEqual({
    name: long.name,
    qrValue: "signed-token",
    loading: false,
    code: "Y4Q7K2",
  });
  expect(screen.getByText("Y4Q7K2")).toHaveClass("wrap-anywhere");
});
