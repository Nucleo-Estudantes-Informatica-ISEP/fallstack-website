import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanySavedStudentsList from ".";

const LONG_NAME =
  "Maria Inês Vasconcelos de Albuquerque Teixeira-Montenegro Sintética da Silva Pereira Rodrigues Lop";

function saved(code: string, name: string): SavedStudentDto {
  return {
    studentId: `id-${code}`,
    createdAt: "2026-11-12T16:36:00.000Z",
    comment: null,
    student: { code, name },
  } as SavedStudentDto;
}

test("an empty list explains, in company wording, where saves will appear", () => {
  render(<CompanySavedStudentsList savedStudents={[]} />);

  expect(screen.getByText(/Ainda não há perfis guardados/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  // The student dashboard's wording must not leak into the company view.
  expect(screen.queryByText(/Os teus scans/)).toBeNull();
});

test("lists saved students in a captioned table with column headers", () => {
  render(
    <CompanySavedStudentsList
      savedStudents={[
        saved("Z101", "Beatriz Sintética"),
        saved("Z102", "Rui Mínimo"),
      ]}
    />
  );

  const table = screen.getByRole("table", { name: "Perfis guardados" });
  expect(
    within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent)
  ).toEqual(["Nome", "Data", "Ação"]);
  expect(within(table).getAllByRole("row")).toHaveLength(3);
});

test("each name opens that student's preview", () => {
  render(
    <CompanySavedStudentsList
      savedStudents={[saved("Z101", "Beatriz Sintética")]}
    />
  );

  expect(
    screen.getByRole("link", { name: "Beatriz Sintética" })
  ).toHaveAttribute("href", "/student/Z101/preview");
});

test("long names are clamped to two lines but stay available in full", () => {
  render(
    <CompanySavedStudentsList savedStudents={[saved("Z103", LONG_NAME)]} />
  );

  const link = screen.getByRole("link", { name: LONG_NAME });
  expect(link).toHaveClass("line-clamp-2");
  expect(link).toHaveAttribute("title", LONG_NAME);
});

test("dates are machine-readable", () => {
  render(
    <CompanySavedStudentsList
      savedStudents={[saved("Z101", "Beatriz Sintética")]}
    />
  );

  const time = screen.getByRole("table").querySelector("time");
  expect(time).toHaveAttribute("datetime", "2026-11-12T16:36:00.000Z");
});

test("the always-saved column is hidden on narrow screens", () => {
  render(
    <CompanySavedStudentsList
      savedStudents={[saved("Z101", "Beatriz Sintética")]}
    />
  );

  expect(screen.getByRole("columnheader", { name: "Ação" })).toHaveClass(
    "hidden",
    "sm:table-cell"
  );
  expect(screen.getByText("SALVO").closest("td")).toHaveClass(
    "hidden",
    "sm:table-cell"
  );
});
