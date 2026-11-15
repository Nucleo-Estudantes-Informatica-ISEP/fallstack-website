import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminPageHeader from "@/components/AdminPageHeader";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { listScheduleEventsForAdmin } from "@/application/services/scheduleService";

const PAGE_SIZE = 20;

interface ScheduleAdminPageProps {
  searchParams: AdminListSearchParams;
}

type ScheduleRow = ReturnType<typeof toScheduleEventDto>;

const columns: DataTableColumn<ScheduleRow>[] = [
  { key: "day", header: "Dia", render: (e) => e.day, sortable: true },
  {
    key: "startTime",
    header: "Início",
    render: (e) => e.startTime,
    sortable: true,
  },
  { key: "endTime", header: "Fim", render: (e) => e.endTime },
  {
    key: "activity",
    header: "Atividade",
    render: (e) => e.activity,
    sortable: true,
  },
];

const ScheduleAdminPage = async ({ searchParams }: ScheduleAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listScheduleEventsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const events = items.map((event) => toScheduleEventDto(event));

  return (
    <section className="flex flex-col gap-6 p-8">
      <AdminPageHeader title="Programa">
        <Link
          href="/schedule/order"
          className="ui-focus inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 py-2 whitespace-nowrap hover:bg-gray-100"
        >
          Ordenar
        </Link>

        <Link
          href="/schedule/new"
          className="ui-focus inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 whitespace-nowrap text-white hover:bg-primary/90"
        >
          Adicionar atividade
        </Link>
      </AdminPageHeader>

      <DataTable
        columns={columns}
        rows={events}
        rowKey={(event) => event.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/schedule"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por atividade..."
        renderActions={(event) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/schedule/${event.id}/edit`}
              aria-label={`Editar ${event.activity}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminDeleteButton
              deleteUrl={`/admin/schedule/${event.id}`}
              itemLabel={event.activity}
            />
          </div>
        )}
      />
    </section>
  );
};

export default ScheduleAdminPage;
