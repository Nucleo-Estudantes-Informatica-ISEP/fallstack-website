import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import CompanyProfileSectionContainer from ".";

const { handleLogout } = vi.hoisted(() => ({ handleLogout: vi.fn() }));

vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout, ConfirmDialog: null }),
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyImage", () => ({
  default: () => null,
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyStatsSection", () => ({
  default: () => <div data-testid="summary-tab" />,
}));
vi.mock(
  "@/components/Companies/CompanyProfile/CompanySavedProfilesSection",
  () => ({ default: () => <div data-testid="scan-tab" /> })
);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderDashboard() {
  return render(
    <CompanyProfileSectionContainer
      company={{ id: "c1", name: "Armis" } as never}
      employeeName="Rui"
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      totalStudents={10}
      history={[]}
      interestIds={[]}
      availableInterests={[]}
    />
  );
}

function menuLabels() {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent?.trim());
}

test("the employee menu has only Sumário, Scan de Perfil and Logout", () => {
  renderDashboard();

  expect(menuLabels()).toEqual(["Sumário", "Scan de Perfil", "Logout"]);
});

test("no student-only or staff entries are offered to employees", () => {
  renderDashboard();

  for (const label of [
    /passe/i,
    /desafios/i,
    /informações pessoais/i,
    /palestras/i,
    /presenças|attendance|check-in/i,
  ])
    expect(screen.queryByRole("button", { name: label })).toBeNull();
});

test("the header shows the company and the employee", () => {
  renderDashboard();

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading).toHaveTextContent("Armis");
  expect(heading).toHaveTextContent("Rui");
});

test("Sumário is shown first and Scan de Perfil switches the content", () => {
  renderDashboard();

  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();
  expect(screen.queryByTestId("scan-tab")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Scan de Perfil" }));

  expect(screen.getByTestId("scan-tab")).toBeInTheDocument();
  expect(screen.queryByTestId("summary-tab")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Sumário" }));

  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();
});

test("Logout asks for confirmation instead of changing the tab", () => {
  renderDashboard();

  fireEvent.click(screen.getByRole("button", { name: "Logout" }));

  expect(handleLogout).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();
});

test("every menu entry sits inside navigation", () => {
  renderDashboard();

  const navs = screen.getAllByRole("navigation");
  const inNav = navs.flatMap((nav) =>
    within(nav)
      .getAllByRole("button")
      .map((button) => button.textContent?.trim())
  );
  expect(inNav).toEqual(["Sumário", "Scan de Perfil", "Logout"]);
});
