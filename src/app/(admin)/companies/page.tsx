import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import LogoThumbnail from "@/components/ui/LogoThumbnail";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import { listCompaniesForAdmin } from "@/application/services/companyService";

const PAGE_SIZE = 20;

interface CompaniesAdminPageProps {
  searchParams: AdminListSearchParams;
}

type CompanyRow = ReturnType<typeof toAdminCompanyDto>;

const columns: DataTableColumn<CompanyRow>[] = [
  {
    key: "avatar",
    header: "Logótipo",
    render: (company) =>
      company.avatar ? <LogoThumbnail src={company.avatar} size={40} /> : null,
  },
  { key: "name", header: "Nome", render: (c) => c.name, sortable: true },
  { key: "rank", header: "Rank", render: (c) => c.rank.name },
  { key: "website", header: "Website", render: (c) => c.website ?? "-" },
  { key: "order", header: "Ordem", render: (c) => c.order, sortable: true },
];

const CompaniesAdminPage = async ({
  searchParams,
}: CompaniesAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listCompaniesForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const companies = items.map(toAdminCompanyDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
        <div className="flex gap-2">
          <Link
            href="/companies/ranks"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Gerir ranks
          </Link>
          <Link
            href="/companies/rank-board"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Ordenar por rank
          </Link>
          <Link
            href="/companies/new"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Adicionar empresa
          </Link>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={companies}
        rowKey={(company) => company.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/companies"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(company) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/companies/${company.id}/edit`}
              aria-label={`Editar ${company.name}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminToggleButton
              checked={company.active}
              label={`Ativar/desativar ${company.name}`}
              patchUrl={`/admin/companies/${company.id}`}
              field="active"
            />
          </div>
        )}
      />
    </section>
  );
};

export default CompaniesAdminPage;
