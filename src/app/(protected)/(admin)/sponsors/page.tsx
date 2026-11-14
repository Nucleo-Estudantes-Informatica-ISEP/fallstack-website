import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import LogoThumbnail from "@/components/ui/LogoThumbnail";
import AdminPageHeader from "@/components/AdminPageHeader";
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
    render: (sponsor) => <LogoThumbnail src={sponsor.logo} size={40} />,
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
      <AdminPageHeader title="Patrocinadores">
        <Link
          href="/sponsors/new"
          className="ui-focus inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 whitespace-nowrap text-white hover:bg-primary/90"
        >
          Adicionar patrocinador
        </Link>
      </AdminPageHeader>

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
              <FiEdit2 size={16} />
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
