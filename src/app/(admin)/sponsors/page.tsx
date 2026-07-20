import Image from "next/image";
import Link from "next/link";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import { listSponsorsForAdmin } from "@/application/services/sponsorService";

const PAGE_SIZE = 20;

interface SponsorsAdminPageProps {
  searchParams: AdminListSearchParams;
}

type SponsorRow = ReturnType<typeof toAdminSponsorDto>;

const columns: DataTableColumn<SponsorRow>[] = [
  {
    key: "logo",
    header: "Logótipo",
    render: (sponsor) => (
      <Image
        src={sponsor.logo}
        alt=""
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    ),
  },
  { key: "name", header: "Nome", render: (s) => s.name, sortable: true },
  { key: "website", header: "Website", render: (s) => s.website ?? "-" },
  { key: "order", header: "Ordem", render: (s) => s.order, sortable: true },
];

const SponsorsAdminPage = async ({ searchParams }: SponsorsAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listSponsorsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const sponsors = items.map(toAdminSponsorDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Patrocinadores</h1>
        <Link
          href="/sponsors/new"
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Adicionar patrocinador
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={sponsors}
        rowKey={(sponsor) => sponsor.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/sponsors"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(sponsor) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/sponsors/${sponsor.id}/edit`}
              aria-label={`Editar ${sponsor.name}`}
              className="hover:text-primary"
            >
              ✏️
            </Link>
            <AdminToggleButton
              checked={sponsor.active}
              label={`Ativar/desativar ${sponsor.name}`}
              patchUrl={`/admin/sponsors/${sponsor.id}`}
              field="active"
            />
          </div>
        )}
      />
    </section>
  );
};

export default SponsorsAdminPage;
