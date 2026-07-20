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

test("renders a sortable column header as a link that toggles order", () => {
  const sortableColumns = [
    {
      key: "name",
      header: "Name",
      render: (row: Row) => row.name,
      sortable: true,
    },
  ];

  render(
    <DataTable<Row>
      columns={sortableColumns}
      rows={[{ id: "1", name: "Alice" }]}
      rowKey={(row) => row.id}
      page={1}
      pageSize={10}
      totalCount={1}
      basePath="/students"
      sort={{ key: "name", order: "asc" }}
    />
  );

  const header = screen.getByRole("link", { name: /Name/ });
  expect(header).toHaveAttribute(
    "href",
    "/students?page=1&sort=name&order=desc"
  );
});

test("preserves the search term and sort state across pagination links", () => {
  render(
    <DataTable<Row>
      columns={columns}
      rows={[{ id: "1", name: "Alice" }]}
      rowKey={(row) => row.id}
      page={1}
      pageSize={1}
      totalCount={2}
      basePath="/students"
      sort={{ key: "name", order: "desc" }}
      searchValue="ali"
    />
  );

  expect(screen.getByRole("link", { name: "Seguinte" })).toHaveAttribute(
    "href",
    "/students?page=2&q=ali&sort=name&order=desc"
  );
  expect(screen.getByPlaceholderText("Pesquisar...")).toHaveValue("ali");
});
