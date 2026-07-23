import Link from "next/link";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toActionDto } from "@/application/dto/actionDto";
import { listActionsForAdmin } from "@/application/services/actionService";

const PAGE_SIZE = 20;

interface ActionsAdminPageProps {
  searchParams: AdminListSearchParams;
}

type ActionRow = ReturnType<typeof toActionDto>;

const columns: DataTableColumn<ActionRow>[] = [
  { key: "name", header: "Nome", render: (a) => a.name, sortable: true },
  { key: "points", header: "Pontos", render: (a) => a.points, sortable: true },
  { key: "altText", header: "Texto alt.", render: (a) => a.altText || "-" },
];

const ActionsAdminPage = async ({ searchParams }: ActionsAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listActionsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const actions = items.map(toActionDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Ações</h1>
        <Link
          href="/actions/new"
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Adicionar ação
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={actions}
        rowKey={(action) => action.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/actions"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(action) => (
          <div className="flex items-center gap-4">
            <Link
              href={`/actions/${action.id}/edit`}
              aria-label={`Editar ${action.name}`}
              className="hover:text-primary"
            >
              ✏️
            </Link>
            <Link
              href={`/actions/${action.id}`}
              className="text-blue-500 hover:underline"
            >
              QR
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Live</span>
              <AdminToggleButton
                checked={action.isLive}
                label={`Ativar/desativar ${action.name}`}
                patchUrl={`/admin/actions/${action.id}`}
                field="isLive"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Visível</span>
              <AdminToggleButton
                checked={action.isVisible}
                label={`Mostrar/ocultar ${action.name}`}
                patchUrl={`/admin/actions/${action.id}`}
                field="isVisible"
              />
            </div>
          </div>
        )}
      />
    </section>
  );
};

export default ActionsAdminPage;
