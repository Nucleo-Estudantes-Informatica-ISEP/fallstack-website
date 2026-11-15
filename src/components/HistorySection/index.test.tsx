import { render, screen, within } from "@testing-library/react";
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

test("is a captioned table with the Nome, Data and Ação column headers", () => {
  render(<HistorySection historyData={[]} />);

  const table = screen.getByRole("table", { name: "Histórico de scans" });
  expect(
    within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent)
  ).toEqual(["Nome", "Data", "Ação"]);
});

test("each row is a table row with the date in a time element", () => {
  render(<HistorySection historyData={rows} />);

  const [, first] = screen.getAllByRole("row");
  const cells = within(first).getAllByRole("cell");
  expect(cells.map((cell) => cell.textContent)).toEqual([
    "Empresa Alfa",
    formatDateDDStrMonthHourMin(rows[0].createdAt),
    "SALVO",
  ]);
  expect(cells[1].querySelector("time")).toHaveAttribute(
    "datetime",
    rows[0].createdAt
  );
});

test("the empty text spans the whole table", () => {
  render(<HistorySection historyData={[]} />);

  expect(screen.getByRole("cell")).toHaveAttribute("colspan", "3");
});

test("a long company name wraps inside its column", () => {
  const longName =
    "Empresa Sintética com um Nome Extremamente Comprido para Testar Quebras de Linha em Ecrãs Estreitos SA";
  render(
    <HistorySection
      historyData={[
        { ...rows[0], savedBy: { name: "R", company: { name: longName } } },
      ]}
    />
  );

  expect(screen.getByRole("table")).toHaveClass("table-fixed");
  expect(screen.getByRole("cell", { name: longName })).toHaveClass(
    "wrap-break-word"
  );
});

test("the company variant links each student to their preview", () => {
  render(<HistorySection historyData={rows.slice(0, 1)} isCompany />);

  expect(
    screen.getByRole("link", { name: "Carolina Referência" })
  ).toHaveAttribute("href", "/student/Z100/preview");
  expect(screen.queryByText("Empresa Alfa")).toBeNull();
});
