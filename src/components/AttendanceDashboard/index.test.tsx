import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AttendanceDashboard from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout: vi.fn(), ConfirmDialog: null }),
}));
vi.mock("@/components/AttendanceScanner", () => ({
  default: () => <div data-testid="scanner" />,
}));

const props = {
  sessions: [],
  staffName: "Ana",
  staffEmail: "ana@nei-isep.org",
  initialSessionId: null,
  profileHref: null,
};

test("shows the staff member in the header and the scanner in the card", () => {
  render(<AttendanceDashboard {...props} />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana");
  expect(screen.getByText("ana@nei-isep.org")).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "Scan de Palestras" })
  ).toContainElement(screen.getByTestId("scanner"));
});

test("marks Scan de Palestras as the current page", () => {
  render(<AttendanceDashboard {...props} />);

  expect(
    screen.getByRole("link", { name: "Scan de Palestras" })
  ).toHaveAttribute("aria-current", "page");
});

test("links back to the profile only for staff who have one", () => {
  const { rerender } = render(<AttendanceDashboard {...props} />);
  expect(screen.queryByRole("link", { name: "Sumário" })).toBeNull();

  rerender(<AttendanceDashboard {...props} profileHref="/student/AB12" />);
  expect(screen.getByRole("link", { name: "Sumário" })).toHaveAttribute(
    "href",
    "/student/AB12"
  );
});

test("keeps Logout in the menu", () => {
  render(<AttendanceDashboard {...props} />);
  expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
});
