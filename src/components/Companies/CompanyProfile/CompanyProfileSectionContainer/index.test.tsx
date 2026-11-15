import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanyProfileSectionContainer from ".";

const { handleLogout } = vi.hoisted(() => ({ handleLogout: vi.fn() }));

vi.mock("@/lib/http/client", () => ({ httpClient: { get: vi.fn() } }));
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout, ConfirmDialog: null }),
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyImage", () => ({
  default: () => <div data-testid="company-logo" />,
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyStatsSection", () => ({
  default: ({ history }: { history: SavedStudentDto[] }) => (
    <div data-testid="summary-tab">
      {history.map((item) => (
        <span key={item.studentId}>{item.student.name}</span>
      ))}
    </div>
  ),
}));
vi.mock(
  "@/components/Companies/CompanyProfile/CompanySavedProfilesSection",
  () => ({ default: () => <div data-testid="scan-tab" /> })
);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderDashboard(company: { avatar?: string | null } = {}) {
  return render(
    <CompanyProfileSectionContainer
      company={{ id: "c1", name: "Armis", avatar: null, ...company } as never}
      employeeName="Rui"
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      totalStudents={10}
      history={[]}
      historyHasMore={false}
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

  // Company name is the title; the employee name is the line below it.
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Armis");
  expect(screen.getByText("Rui")).toBeInTheDocument();
});

test("the company logo shows only when the company has one", () => {
  const { unmount } = renderDashboard();
  expect(screen.queryByTestId("company-logo")).toBeNull();
  unmount();

  renderDashboard({ avatar: "/api/media/logo/logo-id" });
  expect(screen.getByTestId("company-logo")).toBeInTheDocument();
});

test("the current menu entry is marked and moves with the selection", () => {
  renderDashboard();

  expect(screen.getByRole("button", { name: "Sumário" })).toHaveAttribute(
    "aria-current",
    "true"
  );

  fireEvent.click(screen.getByRole("button", { name: "Scan de Perfil" }));

  expect(
    screen.getByRole("button", { name: "Scan de Perfil" })
  ).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: "Sumário" })).not.toHaveAttribute(
    "aria-current"
  );
});

test("selecting an entry moves keyboard focus to its content", () => {
  renderDashboard();

  // Opening the dashboard does not move focus.
  expect(document.body).toHaveFocus();

  const scan = screen.getByRole("button", { name: "Scan de Perfil" });
  scan.focus();
  fireEvent.click(scan);

  const scanRegion = screen.getByRole("region", { name: "Scan de Perfil" });
  expect(scanRegion).toHaveFocus();
  expect(within(scanRegion).getByTestId("scan-tab")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Sumário" }));

  const summaryRegion = screen.getByRole("region", { name: "Sumário" });
  expect(summaryRegion).toHaveFocus();
  expect(within(summaryRegion).getByTestId("summary-tab")).toBeInTheDocument();
});

test("pressing the current entry again leaves focus on it", () => {
  renderDashboard();

  const summary = screen.getByRole("button", { name: "Sumário" });
  summary.focus();
  fireEvent.click(summary);

  expect(summary).toHaveFocus();
});

test("below lg the selected content comes before the menu", () => {
  renderDashboard();
  fireEvent.click(screen.getByRole("button", { name: "Scan de Perfil" }));

  const region = screen.getByRole("region", { name: "Scan de Perfil" });
  const nav = screen.getByRole("navigation", { name: "Painel da empresa" });
  // Content first in reading and tab order; lg:order puts the menu on the
  // left from lg up.
  expect(
    region.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(region.parentElement).toHaveClass("lg:order-2");
  expect(nav.parentElement).toHaveClass("lg:order-1");

  // A label names the open section, and its menu entry is hidden there.
  const label = region.previousElementSibling;
  expect(label).toHaveTextContent("Scan de Perfil");
  expect(label).toHaveClass("lg:hidden");
  expect(screen.getByRole("button", { name: "Scan de Perfil" })).toHaveClass(
    "hidden",
    "lg:flex"
  );
  expect(screen.getByRole("button", { name: "Sumário" })).not.toHaveClass(
    "hidden"
  );
});

test("the menu is a labelled navigation landmark", () => {
  renderDashboard();

  expect(
    screen.getByRole("navigation", { name: "Painel da empresa" })
  ).toBeInTheDocument();
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

function student(name: string): SavedStudentDto {
  return {
    studentId: name,
    createdAt: "2026-11-14T12:00:00.000Z",
    comment: null,
    student: { code: name, name },
    savedBy: { name: "Employee", company: null },
  };
}

test("a refresh discards an older pending page and permits loading from the refreshed cursor", async () => {
  let resolveOld!: (page: {
    items: SavedStudentDto[];
    hasMore: boolean;
  }) => void;
  vi.mocked(httpClient.get)
    .mockResolvedValueOnce({ items: [student("Second")], hasMore: true })
    .mockImplementationOnce(
      () =>
        new Promise<never>((resolve) => {
          resolveOld = resolve as unknown as typeof resolveOld;
        })
    )
    .mockResolvedValueOnce({ items: [student("New second")], hasMore: false });

  const props = {
    company: {} as never,
    employeeName: "Employee",
    globalStats: { totalScans: 0, totalSaves: 0 },
    totalStudents: 0,
    history: [student("First")],
    historyHasMore: true,
    interestIds: [],
    availableInterests: [],
  };
  const view = render(<CompanyProfileSectionContainer {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  await screen.findByText("Second");
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  expect(screen.getByRole("button", { name: "A carregar..." })).toBeDisabled();

  view.rerender(
    <CompanyProfileSectionContainer
      {...props}
      history={[student("Refreshed")]}
    />
  );
  expect(screen.queryByText("Second")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Carregar mais" })).toBeEnabled();
  await act(async () =>
    resolveOld({ items: [student("Old third")], hasMore: false })
  );
  expect(screen.queryByText("Old third")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  await screen.findByText("New second");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Carregar mais" })
    ).not.toBeInTheDocument()
  );
  expect(vi.mocked(httpClient.get).mock.calls[2][0]).toContain(
    "studentId=Refreshed"
  );
});

function renderWithMore() {
  return render(
    <CompanyProfileSectionContainer
      company={{} as never}
      employeeName="Employee"
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      totalStudents={0}
      history={[student("First")]}
      historyHasMore
      interestIds={[]}
      availableInterests={[]}
    />
  );
}

// The button is disabled while a page loads, which in a browser drops
// keyboard focus to the page body.
function startLoading() {
  const button = screen.getByRole("button", { name: "Carregar mais" });
  button.focus();
  fireEvent.click(button);
  const busy = screen.getByRole("button", { name: "A carregar..." });
  expect(busy).toBeDisabled();
  expect(busy).toHaveAttribute("aria-busy", "true");
  (document.activeElement as HTMLElement | null)?.blur();
}

test("Carregar mais uses the shared action style", () => {
  renderWithMore();

  expect(screen.getByRole("button", { name: "Carregar mais" })).toHaveClass(
    "ui-action"
  );
});

test("after a page loads, focus returns to Carregar mais", async () => {
  vi.mocked(httpClient.get).mockResolvedValueOnce({
    items: [student("Second")],
    hasMore: true,
  });
  renderWithMore();

  startLoading();

  await screen.findByText("Second");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Carregar mais" })).toHaveFocus()
  );
});

test("a failed page keeps focus on Carregar mais and says why", async () => {
  vi.mocked(httpClient.get).mockRejectedValueOnce(new Error("offline"));
  renderWithMore();

  startLoading();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar mais perfis."
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Carregar mais" })).toHaveFocus()
  );
});

test("after the last page, focus moves to the panel instead of the page", async () => {
  vi.mocked(httpClient.get).mockResolvedValueOnce({
    items: [student("Last")],
    hasMore: false,
  });
  renderWithMore();

  startLoading();

  await screen.findByText("Last");
  expect(screen.queryByRole("button", { name: /Carregar mais/ })).toBeNull();
  await waitFor(() =>
    expect(screen.getByRole("region", { name: "Sumário" })).toHaveFocus()
  );
});

test("focus the user moved elsewhere while loading is left alone", async () => {
  vi.mocked(httpClient.get).mockResolvedValueOnce({
    items: [student("Second")],
    hasMore: true,
  });
  renderWithMore();

  startLoading();
  const scan = screen.getByRole("button", { name: "Scan de Perfil" });
  scan.focus();

  await screen.findByText("Second");
  expect(scan).toHaveFocus();
});
