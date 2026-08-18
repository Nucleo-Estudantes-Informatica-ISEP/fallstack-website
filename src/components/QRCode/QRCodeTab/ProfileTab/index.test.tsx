import type { PropsWithChildren } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import ProfileTab from ".";

const { getMock, startMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  startMock: vi.fn(),
}));

vi.mock("@/lib/http/client", () => ({
  httpClient: { get: (...args: unknown[]) => getMock(...args) },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: PropsWithChildren) => <div>{children}</div>,
  },
  useAnimation: () => ({ start: startMock }),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <output>{value}</output>,
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getMock.mockResolvedValue({ data: "qr-token" });
});

afterEach(() => {
  vi.useRealTimers();
});

test("refreshes the personal QR code before its token expires", async () => {
  render(
    <ProfileTab
      user={{
        role: "STUDENT",
        adminRole: null,
        student: { code: "1234567", name: "Student" },
      }}
    />
  );

  await act(async () => {
    await Promise.resolve();
  });
  expect(getMock).toHaveBeenCalledTimes(1);
  expect(getMock).toHaveBeenLastCalledWith("/qrcode");

  await act(async () => {
    vi.advanceTimersByTime(25 * 60 * 1000);
    await Promise.resolve();
  });

  expect(getMock).toHaveBeenCalledTimes(2);
});

test("retries a failed refresh before the displayed QR expires", async () => {
  render(
    <ProfileTab
      user={{
        role: "STUDENT",
        adminRole: null,
        student: { code: "1234567", name: "Student" },
      }}
    />
  );

  await act(async () => {
    await Promise.resolve();
  });
  getMock.mockRejectedValueOnce(new Error("temporary failure"));

  await act(async () => {
    vi.advanceTimersByTime(25 * 60 * 1000);
    await Promise.resolve();
  });
  expect(getMock).toHaveBeenCalledTimes(2);

  await act(async () => {
    vi.advanceTimersByTime(30 * 1000);
    await Promise.resolve();
  });
  expect(getMock).toHaveBeenCalledTimes(3);
});
