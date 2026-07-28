import Link from "next/link";
import { notFound } from "next/navigation";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminAccountDto } from "@/application/dto/adminAccountDto";
import { listAdminsForAdmin } from "@/application/services/adminAccountService";
import getServerSession from "@/application/services/sessionService";

const PAGE_SIZE = 20;

interface AdminsPageProps {
  searchParams: AdminListSearchParams;
}

type AdminRow = ReturnType<typeof toAdminAccountDto>;

const columns: DataTableColumn<AdminRow>[] = [
  { key: "name", header: "Nome", render: (a) => a.name, sortable: true },
  { key: "email", header: "Email", render: (a) => a.email, sortable: true },
  {
    key: "adminRole",
    header: "Tipo",
    render: (a) => (a.adminRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"),
  },
];

const AdminsPage = async ({ searchParams }: AdminsPageProps) => {
  const session = await getServerSession();
  if (!session || session.adminRole !== "SUPER_ADMIN") notFound();

  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listAdminsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const admins = items.map(toAdminAccountDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Admins</h1>
        <Link
          href="/admins/new"
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Adicionar admin
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={admins}
        rowKey={(admin) => admin.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/admins"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome ou email..."
        renderActions={(admin) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/admins/${admin.id}/edit`}
              aria-label={`Editar ${admin.name}`}
              className="hover:text-primary"
            >
              ✏️
            </Link>
            <AdminToggleButton
              checked={admin.active}
              label={`Ativar/desativar ${admin.name}`}
              patchUrl={`/admin/admins/${admin.id}`}
              field="active"
            />
            <AdminDeleteButton
              deleteUrl={`/admin/admins/${admin.id}`}
              itemLabel={admin.name}
              disabled={admin.id === session.id}
              disabledReason="Não podes eliminar a tua própria conta"
            />
          </div>
        )}
      />
    </section>
  );
};

export default AdminsPage;
