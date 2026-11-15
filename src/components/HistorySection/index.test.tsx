import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

import HistorySection from ".";

const rows: SavedStudentDto[] = [
  {
    studentId: "s1",
    createdAt: "2026-11-15T09:39:00.000Z",
    comment: null,
    student: { code: "Z100", name: "Carolina Referência" },
    savedBy: { name: "Recrutador Alfa", company: { name: "Empresa Alfa" } },
  },
  {
    studentId: "s1",
    createdAt: "2026-11-14T06:49:00.000Z",
    comment: "Boa conversa.",
    student: { code: "Z100", name: "Carolina Referência" },
    savedBy: { name: "Recrutador Beta", company: { name: "Empresa Beta" } },
  },
];

test("the student view lists the saving company, the date and SALVO", () => {
  render(<HistorySection historyData={rows} />);

  expect(screen.getByText("Empresa Alfa")).toBeInTheDocument();
  expect(screen.getByText("Empresa Beta")).toBeInTheDocument();
  expect(
    screen.getByText(formatDateDDStrMonthHourMin(rows[0].createdAt))
  ).toBeInTheDocument();
  expect(
    screen.getByText(formatDateDDStrMonthHourMin(rows[1].createdAt))
  ).toBeInTheDocument();
  expect(screen.getAllByText("SALVO")).toHaveLength(2);
  expect(screen.queryByText("Carolina Referência")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
});

test("shows the empty text when there are no scans", () => {
  render(<HistorySection historyData={[]} />);

  expect(
    screen.getByText("Os teus scans aparecerão aqui!")
  ).toBeInTheDocument();
  expect(screen.queryByText("SALVO")).toBeNull();
});

test("keeps the column headers", () => {
  render(<HistorySection historyData={[]} />);

  expect(screen.getByText("Nome")).toBeInTheDocument();
  expect(screen.getByText("Data")).toBeInTheDocument();
  expect(screen.getByText("Ação")).toBeInTheDocument();
});

test("the company variant links each student to their preview", () => {
  render(<HistorySection historyData={rows.slice(0, 1)} isCompany />);

  expect(
    screen.getByRole("link", { name: "Carolina Referência" })
  ).toHaveAttribute("href", "/student/Z100/preview");
  expect(screen.queryByText("Empresa Alfa")).toBeNull();
});
