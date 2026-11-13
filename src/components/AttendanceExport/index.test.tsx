import { fireEvent, render, screen } from "@testing-library/react";
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
test("day selection changes both formats without combining check-ins", () => {
  render(
    <AttendanceExport
      rows={[[{ Name: "First" }], [{ Name: "Second" }]]}
      days={["17 November", "18 November"]}
    />
  );
  expect(
    screen.getByRole("button", { name: "xlsx: First" })
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
  expect(
    screen.getByRole("button", { name: "xlsx: Second" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "csv: Second" })
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /First/ })).toBeNull();
});
