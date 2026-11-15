import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import StaffAttendanceCard from ".";

test("links NEI staff to the attendance scanner", () => {
  render(<StaffAttendanceCard />);
  expect(screen.getByText("Staff NEI · Presenças")).toBeTruthy();
  expect(
    screen.getByText("Regista os check-ins de quem entra nas sessões.")
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Abrir leitor de presenças" })
      .getAttribute("href")
  ).toBe("/attendance/scan");
});
