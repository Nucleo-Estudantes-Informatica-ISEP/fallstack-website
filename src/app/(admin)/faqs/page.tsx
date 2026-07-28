import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toFaqDto } from "@/application/dto/faqDto";
import { listFaqEntriesForAdmin } from "@/application/services/faqService";

const PAGE_SIZE = 20;

interface FaqsAdminPageProps {
  searchParams: AdminListSearchParams;
}

type FaqRow = ReturnType<typeof toFaqDto>;

const columns: DataTableColumn<FaqRow>[] = [
  {
    key: "question",
    header: "Pergunta",
    render: (faq) => faq.question,
    sortable: true,
  },
  { key: "order", header: "Ordem", render: (faq) => faq.order, sortable: true },
];

const FaqsAdminPage = async ({ searchParams }: FaqsAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listFaqEntriesForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const faqs = items.map(toFaqDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">FAQs</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/faqs/order"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Ordenar
          </Link>
          <Link
            href="/faqs/new"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Adicionar pergunta
          </Link>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={faqs}
        rowKey={(faq) => faq.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/faqs"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por pergunta..."
        renderActions={(faq) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/faqs/${faq.id}/edit`}
              aria-label={`Editar ${faq.question}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminDeleteButton
              deleteUrl={`/admin/faqs/${faq.id}`}
              itemLabel={faq.question}
            />
          </div>
        )}
      />
    </section>
  );
};

export default FaqsAdminPage;
