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

  expect(
    screen.getAllByRole("navigation", { name: "Admin" }).length
  ).toBeGreaterThan(0);

  const dashboardLinks = screen.getAllByRole("link", {
    name: "Dashboard",
  });

  expect(dashboardLinks.length).toBeGreaterThan(0);

  dashboardLinks.forEach((link) => {
    expect(link).toHaveAttribute("href", "/overview");
  });
});

test("marks the current page with aria-current", () => {
  mocks.pathname = "/students";

  render(<AdminSidebar isSuperAdmin={false} />);

  screen.getAllByRole("link", { name: "Students" }).forEach((link) => {
    expect(link).toHaveAttribute("aria-current", "page");
  });

  screen.getAllByRole("link", { name: "Dashboard" }).forEach((link) => {
    expect(link).not.toHaveAttribute("aria-current");
  });
});

test("keeps the active state on nested routes", () => {
  mocks.pathname = "/companies/123";

  render(<AdminSidebar isSuperAdmin={false} />);

  screen.getAllByRole("link", { name: "Companies" }).forEach((link) => {
    expect(link).toHaveAttribute("aria-current", "page");
  });
});

test("hides admin management from regular administrators", () => {
  render(<AdminSidebar isSuperAdmin={false} />);

  expect(screen.queryAllByRole("link", { name: "Admins" })).toHaveLength(0);
});

test("shows admin management to super administrators", () => {
  render(<AdminSidebar isSuperAdmin />);

  screen.getAllByRole("link", { name: "Admins" }).forEach((link) => {
    expect(link).toHaveAttribute("href", "/admins");
  });
});

test("uses shared focus styles and accessible target sizes", () => {
  render(<AdminSidebar isSuperAdmin={false} />);

  const links = [
    ...screen.getAllByRole("link", { name: "Dashboard" }),
    ...screen.getAllByRole("link", { name: "Students" }),
  ];

  links.forEach((link) => {
    expect(link).toHaveClass("ui-focus", "min-h-11");
  });
});
