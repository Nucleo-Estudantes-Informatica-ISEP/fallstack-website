import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import ScheduleBoard from ".";

const { refreshMock, patchMock, toastSuccessMock, toastErrorMock } = vi.hoisted(
  () => ({
    refreshMock: vi.fn(),
    patchMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("react-toastify", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { patch: (...args: unknown[]) => patchMock(...args) },
}));

const events = [
  { id: "a", day: 1, startTime: "09:00", endTime: "10:00", activity: "Talk A" },
  { id: "b", day: 1, startTime: "10:00", endTime: "11:00", activity: "Talk B" },
];

const timeInputs = () =>
  screen.getAllByDisplayValue(/^\d\d:\d\d$/) as HTMLInputElement[];

const saveButton = () => screen.getByRole("button", { name: /Guardar/ });

const invalidWarning = () =>
  screen.queryByText("Alguns horários ficam sobrepostos com esta ordem.");

beforeEach(() => {
  vi.clearAllMocks();
});

test("save is enabled and no warning is shown for a chronologically valid board", () => {
  render(<ScheduleBoard events={events} />);

  expect(invalidWarning()).not.toBeInTheDocument();
  expect(saveButton()).not.toBeDisabled();
});

test("editing a row's time re-validates live and disables save on an overlap", () => {
  render(<ScheduleBoard events={events} />);

  // a's endTime (index 1: 09:00 start, 10:00 end) pushed past b's 10:00 start.
  fireEvent.change(timeInputs()[1], { target: { value: "10:30" } });

  expect(invalidWarning()).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
});

test("saves the reordered board together with the edited time", async () => {
  render(<ScheduleBoard events={events} />);

  fireEvent.change(timeInputs()[1], { target: { value: "09:45" } });
  fireEvent.click(saveButton());

  await waitFor(() =>
    expect(patchMock).toHaveBeenCalledWith("/admin/schedule/order", {
      updates: [
        { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "09:45" },
        { id: "b", day: 1, order: 1, startTime: "10:00", endTime: "11:00" },
      ],
    })
  );
  expect(toastSuccessMock).toHaveBeenCalledWith("Ordem guardada.");
  expect(refreshMock).toHaveBeenCalled();
});

test("shows an error toast without navigating away when saving fails", async () => {
  patchMock.mockRejectedValue(new Error("network down"));

  render(<ScheduleBoard events={events} />);
  fireEvent.click(saveButton());

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível guardar a ordem."
    )
  );
  expect(refreshMock).not.toHaveBeenCalled();
});

test("only the drag handle carries sortable listeners, not the time inputs", () => {
  render(<ScheduleBoard events={events} />);

  const handle = screen.getAllByLabelText("Arrastar para reordenar")[0];
  expect(handle).toHaveAttribute("role", "button");
  expect(handle).toHaveAttribute("tabindex", "0");

  for (const input of timeInputs()) {
    expect(input).not.toHaveAttribute("role");
    expect(input).not.toHaveAttribute("aria-roledescription");
  }
});
