import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import type { AdminCompanyRankDto } from "@/application/dto/companyRankDto";
import { listCompanyRanksForAdmin } from "@/application/services/companyRankService";

const PAGE_SIZE = 20;

interface CompanyRanksAdminPageProps {
  searchParams: AdminListSearchParams;
}

const columns: DataTableColumn<AdminCompanyRankDto>[] = [
  { key: "name", header: "Nome", render: (rank) => rank.name, sortable: true },
  {
    key: "order",
    header: "Ordem",
    render: (rank) => rank.order,
    sortable: true,
  },
  {
    key: "hasInternalPage",
    header: "Página interna",
    render: (rank) => (rank.style?.hasInternalPage ? "Sim" : "Não"),
  },
];

const CompanyRanksAdminPage = async ({
  searchParams,
}: CompanyRanksAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listCompanyRanksForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Ranks de empresas</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/companies/ranks/order"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Ordenar
          </Link>
          <Link
            href="/companies/ranks/new"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Adicionar rank
          </Link>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(rank) => rank.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/companies/ranks"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(rank) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/companies/ranks/${rank.id}/edit`}
              aria-label={`Editar ${rank.name}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminDeleteButton
              deleteUrl={`/admin/company-ranks/${rank.id}`}
              itemLabel={rank.name}
            />
          </div>
        )}
      />
    </section>
  );
};

export default CompanyRanksAdminPage;
