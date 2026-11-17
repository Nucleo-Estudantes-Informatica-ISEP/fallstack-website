import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import * as offlinePassModule from "@/components/PassSection/generateOfflinePass";
import StyledPassCard from "@/components/PassSection/StyledPassCard";

import PassMenuContent from "./PassMenuContent";

vi.mock("@/lib/http/client", () => ({ httpClient: { get: vi.fn() } }));
vi.mock("@/components/PassSection/StyledPassCard", () => ({
  default: vi.fn(() => <p>Pass card</p>),
}));
vi.mock("@/components/GoogleWalletButton", () => ({
  default: () => <p>Google Wallet button</p>,
}));

const student = {
  code: "Z100",
  name: "Carolina Referência",
  user: { email: "carolina@example.com" },
};
const writeText = vi.fn().mockResolvedValue(undefined);

const lastCardProps = () => vi.mocked(StyledPassCard).mock.lastCall?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(offlinePassModule, "downloadOfflinePass").mockImplementation(
    () => {}
  );
  Object.defineProperty(navigator, "share", {
    value: undefined,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: undefined,
    configurable: true,
  });
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

test("handles successful offline pass download", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  const downloadSpy = vi
    .spyOn(offlinePassModule, "generateOfflinePass")
    .mockResolvedValue(new File(["png"], "pass.png", { type: "image/png" }));

  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  const downloadButton = screen.getByRole("button", {
    name: "Descarregar Passe (Offline)",
  });
  fireEvent.click(downloadButton);

  await waitFor(() => {
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        studentName: "Carolina Referência",
        studentEmail: "carolina@example.com",
        permanentCode: "Z100",
      })
    );
  });

  expect(screen.queryByRole("alert")).toBeNull();
  expect(downloadButton).not.toBeDisabled();
});

test("displays error alert when offline pass download fails and allows retry", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  const downloadSpy = vi
    .spyOn(offlinePassModule, "generateOfflinePass")
    .mockRejectedValueOnce(new Error("Canvas failure"))
    .mockResolvedValueOnce(
      new File(["png"], "pass.png", { type: "image/png" })
    );

  render(<PassMenuContent student={student} />);
  await waitFor(() => expect(lastCardProps()?.loading).toBe(false));

  const downloadButton = screen.getByRole("button", {
    name: "Descarregar Passe (Offline)",
  });

  fireEvent.click(downloadButton);

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível gerar o passe offline. Tenta novamente antes de ficares sem internet."
    );
  });

  expect(downloadButton).toBeEnabled();
  expect(downloadButton).toHaveTextContent("Descarregar Passe (Offline)");

  fireEvent.click(downloadButton);

  await waitFor(() => {
    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  expect(downloadButton).toBeEnabled();
});

test("prepares the PNG before opening the share sheet on a fresh tap", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  const file = new File(["png"], "pass.png", { type: "image/png" });
  const generate = vi
    .spyOn(offlinePassModule, "generateOfflinePass")
    .mockResolvedValue(file);
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    value: share,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: vi.fn().mockReturnValue(true),
    configurable: true,
  });
  render(<PassMenuContent student={student} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Descarregar Passe (Offline)" })
  );
  const save = await screen.findByRole("button", {
    name: "Guardar Passe (Offline)",
  });
  expect(share).not.toHaveBeenCalled();
  expect(offlinePassModule.downloadOfflinePass).not.toHaveBeenCalled();
  fireEvent.click(save);
  expect(share).toHaveBeenCalledWith({ files: [file] });
  await waitFor(() => expect(save).toBeEnabled());
  expect(generate).toHaveBeenCalledOnce();

  share.mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"));
  fireEvent.click(save);
  await waitFor(() => expect(save).toBeEnabled());
  expect(screen.queryByRole("alert")).toBeNull();

  share.mockRejectedValueOnce(new Error("Share failed"));
  fireEvent.click(save);
  expect(await screen.findByRole("alert")).toBeVisible();
  fireEvent.click(save);
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

test("downloads when file sharing is unsupported", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  const file = new File(["png"], "pass.png", { type: "image/png" });
  vi.spyOn(offlinePassModule, "generateOfflinePass").mockResolvedValue(file);
  const share = vi.fn();
  Object.defineProperty(navigator, "share", {
    value: share,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: () => false,
    configurable: true,
  });
  render(<PassMenuContent student={student} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Descarregar Passe (Offline)" })
  );
  await waitFor(() =>
    expect(offlinePassModule.downloadOfflinePass).toHaveBeenCalledWith(file)
  );
  expect(share).not.toHaveBeenCalled();
});

test("clears the prepared pass when student identity changes", async () => {
  vi.mocked(httpClient.get).mockResolvedValue({ data: "signed-token" });
  vi.spyOn(offlinePassModule, "generateOfflinePass").mockResolvedValue(
    new File(["png"], "pass.png", { type: "image/png" })
  );
  const share = vi.fn();
  Object.defineProperty(navigator, "share", {
    value: share,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: () => true,
    configurable: true,
  });
  const { rerender } = render(<PassMenuContent student={student} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Descarregar Passe (Offline)" })
  );
  await screen.findByRole("button", { name: "Guardar Passe (Offline)" });
  rerender(<PassMenuContent student={{ ...student, code: "ABCDEF" }} />);
  expect(
    screen.getByRole("button", { name: "Descarregar Passe (Offline)" })
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Guardar Passe (Offline)" })
  ).toBeNull();
  expect(share).not.toHaveBeenCalled();
});
