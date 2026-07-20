import Link from "next/link";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
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
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const colSpan = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-200 text-sm text-gray-700 uppercase">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-6 py-3 text-left">
                  {column.header}
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
            href={`${basePath}?page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={`rounded-md border border-gray-300 px-3 py-1 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-100"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={`${basePath}?page=${Math.min(totalPages, page + 1)}`}
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
