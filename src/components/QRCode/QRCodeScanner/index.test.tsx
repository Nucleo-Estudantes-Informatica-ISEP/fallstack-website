import { act, render } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import QRCodeScanner from ".";

const mocks = vi.hoisted(() => ({
  onError: undefined as undefined | (() => void),
  toastError: vi.fn(),
}));

vi.mock("react-zxing", () => ({
  useZxing: ({ onError }: { onError: () => void }) => {
    mocks.onError = onError;
    return { ref: { current: null } };
  },
}));

vi.mock("react-toastify", () => ({
  toast: { error: mocks.toastError },
}));

test("keeps the scanner mounted when camera setup reports an error", () => {
  const { container } = render(<QRCodeScanner handleScan={vi.fn()} />);

  act(() => mocks.onError?.());

  expect(container.querySelector("video")).not.toBeNull();
  expect(mocks.toastError).toHaveBeenCalledOnce();
});
