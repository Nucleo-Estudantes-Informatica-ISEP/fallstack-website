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
  expect(location.href).toBe("/admin/attendance?day=2");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
