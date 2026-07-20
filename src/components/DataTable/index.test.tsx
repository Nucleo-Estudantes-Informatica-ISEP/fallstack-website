import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import DataTable from "@/components/DataTable";

interface Row {
  id: string;
  name: string;
}

const columns = [
  { key: "name", header: "Name", render: (row: Row) => row.name },
];

test("renders rows and a column header", () => {
  render(
    <DataTable<Row>
      columns={columns}
      rows={[{ id: "1", name: "Alice" }]}
      rowKey={(row) => row.id}
      page={1}
      pageSize={10}
      totalCount={1}
      basePath="/students"
    />
  );

  expect(
    screen.getByRole("columnheader", { name: "Name" })
  ).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
});

test("shows an empty-state row when there are no results", () => {
  render(
    <DataTable<Row>
      columns={columns}
      rows={[]}
      rowKey={(row) => row.id}
      page={1}
      pageSize={10}
      totalCount={0}
      basePath="/students"
    />
  );

  expect(screen.getByText("Sem resultados.")).toBeInTheDocument();
});

test("disables the previous link on the first page and next link on the last page", () => {
  render(
    <DataTable<Row>
      columns={columns}
      rows={[{ id: "1", name: "Alice" }]}
      rowKey={(row) => row.id}
      page={1}
      pageSize={1}
      totalCount={1}
      basePath="/students"
    />
  );

  expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  expect(screen.getByRole("link", { name: "Seguinte" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
});
