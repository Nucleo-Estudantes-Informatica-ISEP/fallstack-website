import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AttendanceExport from ".";

vi.mock("@/components/ExcelButton", () => ({
  default: ({
    rows,
    format = "xlsx",
  }: {
    rows: Record<string, string>[];
    format?: string;
  }) => (
    <button>
      {format}: {rows.map((row) => row.Name).join(",")}
    </button>
  ),
}));
test("day selection loads the requested day", () => {
  const location = { href: "" };
  const originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
  render(
    <AttendanceExport
      rows={[{ Name: "First" }]}
      day={1}
      days={["17 November", "18 November"]}
    />
  );
  expect(
    screen.getByRole("button", { name: "xlsx: First" })
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
  expect(location.href).toBe("/attendance?day=2");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

test("shows all attendance fields in the selected day's table", () => {
  const row = {
    Name: "Ana Silva",
    Email: "1234567@isep.ipp.pt",
    "Student number": "1234567",
    Date: "2026-11-17",
    Period: "Manhã",
    "Check-in time": "2026-11-17T09:00:00.000Z",
    "Valid until": "2026-11-17T13:00:00.000Z",
  };
  const { rerender } = render(
    <AttendanceExport
      rows={[row]}
      day={1}
      days={["17 November", "18 November"]}
    />
  );
  const table = screen.getByRole("table", { name: "Presenças — 17 November" });
  expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
  for (const value of Object.values(row))
    expect(
      within(table).getByRole("cell", { name: value })
    ).toBeInTheDocument();
  rerender(
    <AttendanceExport
      rows={[{ ...row, Name: "Bruno" }]}
      day={2}
      days={["17 November", "18 November"]}
    />
  );
  expect(
    screen.getByRole("table", { name: "Presenças — 18 November" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("cell", { name: "Ana Silva" })
  ).not.toBeInTheDocument();
});

test("explains when the selected day has no attendance", () => {
  render(<AttendanceExport rows={[]} day={1} days={["17 November"]} />);
  expect(
    screen.getByRole("cell", { name: "Sem presenças registadas neste dia." })
  ).toHaveAttribute("colspan", "7");
  expect(
    screen.getByText("0 registos de presença. Horas em UTC.")
  ).toBeInTheDocument();
});
