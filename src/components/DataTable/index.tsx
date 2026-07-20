import Link from "next/link";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableSort {
  key: string;
  order: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pageSize: number;
  totalCount: number;
  basePath: string;
  renderActions?: (row: T) => React.ReactNode;
  emptyLabel?: string;
  /** Current sort state, read from the entity page's searchParams. */
  sort?: DataTableSort;
  /** Current search term, read from the entity page's searchParams. */
  searchValue?: string;
  searchPlaceholder?: string;
}

function buildQuery(
  params: Record<string, string | number | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function DataTable<T>({
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  totalCount,
  basePath,
  renderActions,
  emptyLabel = "Sem resultados.",
  sort,
  searchValue,
  searchPlaceholder = "Pesquisar...",
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const colSpan = columns.length + (renderActions ? 1 : 0);

  const pageHref = (targetPage: number) =>
    `${basePath}${buildQuery({
      page: targetPage,
      q: searchValue,
      sort: sort?.key,
      order: sort?.order,
    })}`;

  const sortHref = (columnKey: string) => {
    const nextOrder: "asc" | "desc" =
      sort?.key === columnKey && sort.order === "asc" ? "desc" : "asc";
    return `${basePath}${buildQuery({
      page: 1,
      q: searchValue,
      sort: columnKey,
      order: nextOrder,
    })}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        action={basePath}
        method="get"
        className="flex flex-wrap items-center gap-2"
      >
        {sort && <input type="hidden" name="sort" value={sort.key} />}
        {sort && <input type="hidden" name="order" value={sort.order} />}
        <input
          type="search"
          name="q"
          defaultValue={searchValue}
          placeholder={searchPlaceholder}
          className="w-full max-w-xs rounded-md border border-gray-300 p-2 text-black"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-100"
        >
          Pesquisar
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-200 text-sm text-gray-700 uppercase">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-6 py-3 text-left">
                  {column.sortable ? (
                    <Link
                      href={sortHref(column.key)}
                      className="flex items-center gap-1 normal-case hover:underline"
                    >
                      {column.header}
                      {sort?.key === column.key && (
                        <span aria-hidden="true">
                          {sort.order === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {renderActions && <th className="px-6 py-3 text-left">Ações</th>}
            </tr>
          </thead>
          <tbody className="text-base text-gray-600">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b transition-colors hover:bg-gray-100"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      {column.render(row)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-6 py-4">{renderActions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {totalCount} resultado{totalCount === 1 ? "" : "s"} · página {page} de{" "}
          {totalPages}
        </span>
        <div className="flex gap-2">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={`rounded-md border border-gray-300 px-3 py-1 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-100"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
            className={`rounded-md border border-gray-300 px-3 py-1 ${
              page >= totalPages
                ? "pointer-events-none opacity-40"
                : "hover:bg-gray-100"
            }`}
          >
            Seguinte
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
