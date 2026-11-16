import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Schedule from ".";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

test("rounded programme keeps both day controls and their events", () => {
  render(
    <Schedule
      firstDayTitle="17 de Novembro"
      secondDayTitle="18 de Novembro"
      scheduleEvents={[
        [{ hour: "09:00", activity: "Opening" }],
        [{ hour: "10:00", activity: "Networking" }],
      ]}
    />
  );
  expect(screen.getByText("Opening")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "18 de Novembro" }));
  expect(
    screen.getByRole("button", { name: "18 de Novembro" })
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Networking")).toBeInTheDocument();
  expect(screen.queryByText("Opening")).not.toBeInTheDocument();
});
