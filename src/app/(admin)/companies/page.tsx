import Image from "next/image";
import Link from "next/link";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
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
      company.avatar ? (
        <Image
          src={company.avatar}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
      ) : null,
  },
  { key: "name", header: "Nome", render: (c) => c.name, sortable: true },
  { key: "tier", header: "Tier", render: (c) => c.tier, sortable: true },
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
            href="/companies/tier-board"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Ordenar por tier
          </Link>
          <Link
            href="/companies/new"
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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
              ✏️
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
