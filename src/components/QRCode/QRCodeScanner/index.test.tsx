import { act, render } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import QRCodeScanner from ".";

const mocks = vi.hoisted(() => ({
  onError: undefined as undefined | (() => void),
  onDecodeResult: undefined as
    undefined | ((result: { getText(): string }) => Promise<void>),
  toastError: vi.fn(),
}));

vi.mock("react-zxing", () => ({
  useZxing: ({
    onError,
    onDecodeResult,
  }: {
    onError: () => void;
    onDecodeResult: (result: { getText(): string }) => Promise<void>;
  }) => {
    mocks.onError = onError;
    mocks.onDecodeResult = onDecodeResult;
    return { ref: { current: null } };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock("react-toastify", () => ({
  toast: { error: mocks.toastError },
}));

test("keeps the scanner mounted when camera setup reports an error", () => {
  const { container } = render(<QRCodeScanner handleScan={vi.fn()} />);

  act(() => mocks.onError?.());

  expect(container.querySelector("video")).not.toBeNull();
  expect(mocks.toastError).toHaveBeenCalledOnce();
});

test("without onMessage, scanner errors stay toasts", async () => {
  render(<QRCodeScanner handleScan={vi.fn()} />);

  await act(() => mocks.onDecodeResult!({ getText: () => "" }));

  expect(mocks.toastError).toHaveBeenCalledWith(
    "Ocorreu um erro a obter o perfil do estudante a partir do QR Code..."
  );
});

test("with onMessage, camera and empty-QR errors go to the caller, not toasts", async () => {
  const onMessage = vi.fn();
  render(<QRCodeScanner handleScan={vi.fn()} onMessage={onMessage} />);

  act(() => mocks.onError?.());
  await act(() => mocks.onDecodeResult!({ getText: () => "" }));

  expect(onMessage).toHaveBeenCalledWith(
    "Não foi possível aceder à câmara. Confirma permissão e tenta novamente."
  );
  expect(onMessage).toHaveBeenCalledWith(
    "Ocorreu um erro a obter o perfil do estudante a partir do QR Code..."
  );
  expect(mocks.toastError).not.toHaveBeenCalled();
});
