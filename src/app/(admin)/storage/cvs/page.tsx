import Link from "next/link";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { listStorageObjects } from "@/application/services/storageAdminService";
import { formatFileSize } from "@/utils/files";

const PAGE_SIZE = 20;

interface CvsAdminPageProps {
  searchParams: AdminListSearchParams;
}

interface StorageRow {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
  url: string;
}

const columns: DataTableColumn<StorageRow>[] = [
  { key: "name", header: "Nome", render: (file) => file.name },
  {
    key: "size",
    header: "Tamanho",
    render: (file) => formatFileSize(file.size),
  },
  {
    key: "url",
    header: "Ficheiro",
    render: (file) => (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        Abrir
      </a>
    ),
  },
];

const CvsAdminPage = async ({ searchParams }: CvsAdminPageProps) => {
  const { page, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listStorageObjects(
    "cv",
    page,
    PAGE_SIZE,
    q
  );

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Ficheiros</h1>

      <div className="flex gap-2">
        <Link
          href="/storage"
          className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-100"
        >
          Avatares
        </Link>
        <Link
          href="/storage/cvs"
          className="rounded-md bg-primary px-3 py-1 text-white"
        >
          CVs
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(file) => file.name}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/storage/cvs"
        searchValue={q}
        searchPlaceholder="Pesquisar por nome de ficheiro..."
        renderActions={(file) => (
          <AdminDeleteButton
            deleteUrl={`/admin/storage/cv/${encodeURIComponent(file.name)}`}
            itemLabel={file.name}
          />
        )}
      />
    </section>
  );
};

export default CvsAdminPage;
