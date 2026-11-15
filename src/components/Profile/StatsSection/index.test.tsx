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
