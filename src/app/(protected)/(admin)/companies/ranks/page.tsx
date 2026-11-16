import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminPageHeader from "@/components/AdminPageHeader";
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
    key: "isFeatured",
    header: "Destaque",
    render: (rank) => (rank.style?.isFeatured ? "Sim" : "Não"),
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
      <AdminPageHeader title="Ranks de empresas">
        <Link
          href="/companies/ranks/order"
          className="ui-focus inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 py-2 whitespace-nowrap hover:bg-gray-100"
        >
          Ordenar
        </Link>
        <Link
          href="/companies/ranks/new"
          className="ui-focus inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 whitespace-nowrap text-white hover:bg-primary/90"
        >
          Adicionar rank
        </Link>
      </AdminPageHeader>

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
