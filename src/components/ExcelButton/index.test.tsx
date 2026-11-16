import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as XLSX from "xlsx";

import ExcelButton from ".";

import download from "downloadjs";

vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof XLSX>();
  return { ...actual, write: vi.fn(actual.write) };
});
vi.mock("downloadjs", () => ({ default: vi.fn() }));
test.each(["xlsx", "csv"] as const)(
  "downloads %s with headers even without check-ins",
  async (format) => {
    const write = vi.mocked(XLSX.write);
    render(
      <ExcelButton
        rows={[]}
        headers={["Name", "Session"]}
        format={format}
        filename="attendance"
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(download).toHaveBeenLastCalledWith(
      expect.any(Blob),
      `attendance.${format}`,
      "application/octet-stream"
    );
    expect(
      XLSX.utils.sheet_to_json(write.mock.calls.at(-1)![0].Sheets.Sheet1, {
        header: 1,
      })
    ).toEqual([["Name", "Session"]]);
    write.mockClear();
  }
);
test("CSV escapes formula-like untrusted names", () => {
  const write = vi.mocked(XLSX.write);
  render(<ExcelButton rows={[{ Name: "=1+1" }]} format="csv" />);
  fireEvent.click(screen.getByRole("button"));
  expect(write.mock.calls.at(-1)![0].Sheets.Sheet1.A2.v).toBe("'=1+1");
  write.mockClear();
});
