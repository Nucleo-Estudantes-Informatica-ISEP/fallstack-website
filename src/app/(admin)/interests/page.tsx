import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminInterestDto } from "@/application/dto/interestDto";
import { listInterestsForAdmin } from "@/application/services/interestService";

const PAGE_SIZE = 20;

interface InterestsAdminPageProps {
  searchParams: AdminListSearchParams;
}

type InterestRow = ReturnType<typeof toAdminInterestDto>;

const columns: DataTableColumn<InterestRow>[] = [
  { key: "name", header: "Nome", render: (i) => i.name, sortable: true },
  {
    key: "usersCount",
    header: "Em uso por",
    render: (i) =>
      `${i.usersCount} utilizador${i.usersCount === 1 ? "" : "es"}`,
  },
];

const InterestsAdminPage = async ({
  searchParams,
}: InterestsAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listInterestsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const interests = items.map(toAdminInterestDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Interesses</h1>
        <Link
          href="/interests/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Adicionar interesse
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={interests}
        rowKey={(interest) => interest.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/interests"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(interest) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/interests/${interest.id}/edit`}
              aria-label={`Editar ${interest.name}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminDeleteButton
              deleteUrl={`/admin/interests/${interest.id}`}
              itemLabel={interest.name}
              disabled={interest.usersCount > 0}
              disabledReason="Não é possível eliminar um interesse em uso."
            />
          </div>
        )}
      />
    </section>
  );
};

export default InterestsAdminPage;
