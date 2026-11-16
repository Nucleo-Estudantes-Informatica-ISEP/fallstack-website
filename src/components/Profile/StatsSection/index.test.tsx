import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";

import StatsSection from ".";

vi.mock("@/components/HistorySection", () => ({
  default: ({ historyData }: { historyData: SavedStudentDto[] }) => (
    <p>{historyData.length} history rows</p>
  ),
}));

const row = (companyName: string): SavedStudentDto => ({
  studentId: "s1",
  createdAt: "2026-11-15T10:00:00.000Z",
  comment: null,
  student: { code: "Z100", name: "Carolina" },
  savedBy: { name: "Recrutador", company: { name: companyName } },
});

test("shows scans, saves and companies left with plural labels", () => {
  render(
    <StatsSection
      stats={{ totalScans: 3, totalSaves: 2 }}
      companiesLeft={7}
      historyData={[]}
    />
  );

  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByText("Scans")).toBeInTheDocument();
  expect(screen.getByText("Gravações de Perfil")).toBeInTheDocument();
  expect(screen.getByText("Empresas restantes")).toBeInTheDocument();
});

test("uses the singular for one scan and one save", () => {
  render(
    <StatsSection
      stats={{ totalScans: 1, totalSaves: 1 }}
      companiesLeft={5}
      historyData={[]}
    />
  );

  expect(screen.getByText("Scan")).toBeInTheDocument();
  expect(screen.getByText("Gravação de Perfil")).toBeInTheDocument();
  expect(screen.queryByText("Scans")).toBeNull();
  expect(screen.queryByText("Gravações de Perfil")).toBeNull();
});

test("passes every history row to the scan history", () => {
  render(
    <StatsSection
      stats={{ totalScans: 2, totalSaves: 2 }}
      companiesLeft={0}
      historyData={[row("Alfa"), row("Beta")]}
    />
  );

  expect(screen.getByText("2 history rows")).toBeInTheDocument();
});

test("has one section heading in the shared style and no second h1", () => {
  render(
    <StatsSection
      stats={{ totalScans: 0, totalSaves: 0 }}
      companiesLeft={3}
      historyData={[]}
    />
  );

  const heading = screen.getByRole("heading", {
    name: "Sumário do teu perfil",
  });
  expect(heading.tagName).toBe("H2");
  expect(heading).toHaveClass(
    "font-sans",
    "font-semibold",
    "text-2xl",
    "lg:text-[1.75rem]",
    "text-center",
    "lg:text-left"
  );
  // The stat labels are text, not headings.
  expect(screen.getAllByRole("heading")).toHaveLength(1);
  expect(screen.getByText("Scans").tagName).toBe("P");
});

test("uses the singular for one company left", () => {
  render(
    <StatsSection
      stats={{ totalScans: 0, totalSaves: 0 }}
      companiesLeft={1}
      historyData={[]}
    />
  );

  expect(screen.getByText("Empresa restante")).toBeInTheDocument();
  expect(screen.queryByText("Empresas restantes")).toBeNull();
});

test("separates the stats with thin token lines, not the old white borders", () => {
  const { container } = render(
    <StatsSection
      stats={{ totalScans: 0, totalSaves: 0 }}
      companiesLeft={0}
      historyData={[]}
    />
  );

  const stats = screen.getByText("Scans").parentElement!.parentElement!;
  expect(stats).toHaveClass(
    "divide-y",
    "divide-ui-border",
    "md:divide-x",
    "md:divide-y-0"
  );
  expect(container.querySelector(".md\:border-x-4")).toBeNull();
  expect(container.querySelector(".rounded-t-3xl")).toBeNull();
});
