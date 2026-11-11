import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import AdminSidebar from "@/components/AdminSidebar";

const mocks = vi.hoisted(() => ({
  pathname: "/overview",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/config/env.client", () => ({
  clientEnv: {
    NEXT_PUBLIC_LOGS_DASHBOARD_URL: "",
  },
}));

beforeEach(() => {
  mocks.pathname = "/overview";
});

test("renders an accessible admin navigation", () => {
  render(<AdminSidebar isSuperAdmin={false} />);

  expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();

  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/overview"
  );
});

test("marks the current page with aria-current", () => {
  mocks.pathname = "/students";

  render(<AdminSidebar isSuperAdmin={false} />);

  expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
    "aria-current"
  );
});

test("keeps the active state on nested routes", () => {
  mocks.pathname = "/companies/123";

  render(<AdminSidebar isSuperAdmin={false} />);

  expect(screen.getByRole("link", { name: "Companies" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("hides admin management from regular administrators", () => {
  render(<AdminSidebar isSuperAdmin={false} />);

  expect(
    screen.queryByRole("link", { name: "Admins" })
  ).not.toBeInTheDocument();
});

test("shows admin management to super administrators", () => {
  render(<AdminSidebar isSuperAdmin />);

  expect(screen.getByRole("link", { name: "Admins" })).toHaveAttribute(
    "href",
    "/admins"
  );
});

test("uses shared focus styles and accessible target sizes", () => {
  render(<AdminSidebar isSuperAdmin={false} />);

  const dashboard = screen.getByRole("link", { name: "Dashboard" });
  const students = screen.getByRole("link", { name: "Students" });

  expect(dashboard).toHaveClass("ui-focus", "min-h-11");
  expect(students).toHaveClass("ui-focus", "min-h-11");
});
