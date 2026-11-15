import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  credentialFromScan,
  getCheckInCount,
  recordCheckIn,
} from "@/client/api/attendance";

import AttendanceScanner, {
  COUNT_POLL_MS,
  RESULT_CARD_MS,
  type AttendanceSessionDto,
} from ".";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/client/api/attendance", () => ({
  recordCheckIn: vi.fn(),
  getCheckInCount: vi.fn(),
  credentialFromScan: vi.fn((text: string) => ({ token: text })),
}));
vi.mock("@/components/QRCode/QRCodeScanner", () => ({
  default: ({ handleScan }: { handleScan: (text: string) => unknown }) => (
    <button type="button" onClick={() => handleScan("TOKEN")}>
      mock-camera
    </button>
  ),
}));

const session = (
  id: string,
  title: string,
  startTime: string,
  endTime: string
): AttendanceSessionDto => ({
  id,
  title,
  startTime,
  endTime,
  start: `2026-11-17T${startTime}:00.000Z`,
  end: `2026-11-17T${endTime}:00.000Z`,
  dayTitle: "17 de Novembro",
});

const sessions = [
  session("talk", "Cloud na prática", "10:00", "11:00"),
  session("ws", "Workshop Git", "10:30", "12:00"),
];

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

function renderScanner(
  props: Partial<Parameters<typeof AttendanceScanner>[0]> = {}
) {
  return render(
    <AttendanceScanner
      sessions={sessions}
      staffName="Ana"
      initialSessionId={null}
      {...props}
    />
  );
}

const scan = () => fireEvent.click(screen.getByText("mock-camera"));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T10:15:00.000Z"));
  vi.clearAllMocks();
  vi.mocked(getCheckInCount).mockResolvedValue({ kind: "count", count: 42 });
  vi.mocked(credentialFromScan).mockImplementation((text) => ({
    token: text,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

test("opens on the running session and shows its count", async () => {
  renderScanner();
  await flush();
  expect(screen.getByText("A DECORRER")).toBeTruthy();
  expect(screen.getByText("Cloud na prática")).toBeTruthy();
  expect(screen.getByText("17 de Novembro · 10:00 – 11:00")).toBeTruthy();
  expect(screen.getByText("42 check-ins")).toBeTruthy();
  expect(getCheckInCount).toHaveBeenCalledWith("talk");
});

test("uses a valid initial session id", async () => {
  renderScanner({ initialSessionId: "ws" });
  await flush();
  expect(screen.getByText("Workshop Git")).toBeTruthy();
  expect(getCheckInCount).toHaveBeenCalledWith("ws");
});

test("shows the name after a recorded scan and refreshes the count", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({
    kind: "recorded",
    name: "Maria Silva",
    checkedInAt: "2026-11-17T10:34:00.000Z",
  });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(recordCheckIn).toHaveBeenCalledWith("talk", { token: "TOKEN" });
  expect(screen.getByText("Maria Silva")).toBeTruthy();
  expect(screen.getByText("Check-in registado · 10:34")).toBeTruthy();
  expect(getCheckInCount).toHaveBeenCalledTimes(2);
});

test("clears the result card and accepts the next scan", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({
    kind: "recorded",
    name: "Maria Silva",
    checkedInAt: "2026-11-17T10:34:00.000Z",
  });
  renderScanner();
  await flush();
  scan();
  await flush();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RESULT_CARD_MS);
  });
  expect(screen.queryByText("Maria Silva")).toBeNull();
  scan();
  await flush();
  expect(recordCheckIn).toHaveBeenCalledTimes(2);
});

test("shows the duplicate card with the name", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({
    kind: "duplicate",
    name: "Joao Costa",
  });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(screen.getByText("Joao Costa")).toBeTruthy();
  expect(screen.getByText("Já tinha check-in nesta sessão")).toBeTruthy();
});

test("shows the invalid pass card", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({ kind: "invalid-credential" });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(screen.getByText("Passe inválido ou expirado")).toBeTruthy();
  expect(
    screen.getByText("Pede para atualizar o QR ou escreve o código")
  ).toBeTruthy();
});

test("shows the outside-session card with the session times", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({ kind: "outside-session" });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(screen.getByText("Fora do horário desta sessão")).toBeTruthy();
  expect(screen.getByText("10:00 – 11:00")).toBeTruthy();
});

test("ignores decodes while a result card is shown", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({
    kind: "recorded",
    name: "Maria Silva",
    checkedInAt: "2026-11-17T10:34:00.000Z",
  });
  renderScanner();
  await flush();
  scan();
  await flush();
  scan();
  await flush();
  expect(recordCheckIn).toHaveBeenCalledTimes(1);
});

test("pauses on unauthorized and links back to the same session", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({ kind: "unauthorized" });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(
    screen.getByText("A tua autorização expirou (não é problema do estudante).")
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Entrar de novo com AuthNEI" })
      .getAttribute("href")
  ).toBe("/api/auth/login?next=%2Fattendance%2Fscan%3Fsession%3Dtalk");
  expect(screen.queryByText("mock-camera")).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(RESULT_CARD_MS * 2);
  });
  expect(
    screen.getByText("A tua autorização expirou (não é problema do estudante).")
  ).toBeTruthy();
  expect(recordCheckIn).toHaveBeenCalledTimes(1);
});

test("pauses when the count poll returns 403", async () => {
  renderScanner();
  await flush();
  vi.mocked(getCheckInCount).mockResolvedValue({ kind: "unauthorized" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(COUNT_POLL_MS);
  });
  expect(
    screen.getByText("A tua autorização expirou (não é problema do estudante).")
  ).toBeTruthy();
  expect(screen.queryByText("mock-camera")).toBeNull();
  const calls = vi.mocked(getCheckInCount).mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(COUNT_POLL_MS * 3);
  });
  expect(vi.mocked(getCheckInCount).mock.calls.length).toBe(calls);
});

test("a failed poll keeps the last count", async () => {
  renderScanner();
  await flush();
  vi.mocked(getCheckInCount).mockResolvedValue({ kind: "error" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(COUNT_POLL_MS);
  });
  expect(screen.getByText("42 check-ins")).toBeTruthy();
});

test("normalises a lowercase typed code", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({ kind: "invalid-credential" });
  renderScanner();
  await flush();
  const input = screen.getByPlaceholderText("Código (ex: AB12)");
  fireEvent.change(input, { target: { value: " ab12 " } });
  fireEvent.click(screen.getByRole("button", { name: "Registar" }));
  await flush();
  expect(recordCheckIn).toHaveBeenCalledWith("talk", { typedCode: "AB12" });
  expect((input as HTMLInputElement).value).toBe("");
});

test("switching session updates the URL", async () => {
  renderScanner();
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Trocar sessão" }));
  fireEvent.click(screen.getByRole("button", { name: /Workshop Git/ }));
  await flush();
  expect(mocks.replace).toHaveBeenCalledWith("/attendance/scan?session=ws");
  expect(getCheckInCount).toHaveBeenLastCalledWith("ws");
});

test("shows the empty state without sessions", async () => {
  renderScanner({ sessions: [] });
  await flush();
  expect(screen.getByText("Não há sessões hoje.")).toBeTruthy();
  expect(screen.queryByText("mock-camera")).toBeNull();
  expect(screen.queryByPlaceholderText("Código (ex: AB12)")).toBeNull();
});

test("result cards set explicit dark text", async () => {
  vi.mocked(recordCheckIn).mockResolvedValue({ kind: "duplicate", name: "J" });
  renderScanner();
  await flush();
  scan();
  await flush();
  expect(screen.getByRole("status").className).toContain("text-gray-900");
});
