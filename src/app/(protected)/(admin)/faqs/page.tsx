import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminPageHeader from "@/components/AdminPageHeader";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toFaqDto } from "@/application/dto/faqDto";
import { listFaqEntriesForAdmin } from "@/application/services/faqService";
import {
  getUiLanguage,
  getUiText,
} from "@/application/services/uiLanguageService";

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
  {
    key: "order",
    header: "Ordem",
    render: (faq) => faq.order,
    sortable: true,
  },
];

const FaqsAdminPage = async ({ searchParams }: FaqsAdminPageProps) => {
  const language = await getUiLanguage();
  const t = await getUiText();

  const { page, sort, order, q } = await parseAdminListParams(searchParams);

  const { items, totalCount } = await listFaqEntriesForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });

  const faqs = items.map((faq) => toFaqDto(faq, language));

  return (
    <section className="flex flex-col gap-6 p-8">
      <AdminPageHeader title="FAQs">
        <Link
          href="/faqs/order"
          className="ui-focus inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 py-2 whitespace-nowrap hover:bg-gray-100"
        >
          {t("Ordenar")}
        </Link>
        <Link
          href="/faqs/new"
          className="ui-focus inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 whitespace-nowrap text-white hover:bg-primary/90"
        >
          {t("Adicionar pergunta")}
        </Link>
      </AdminPageHeader>

      <DataTable
        language={language}
        columns={columns}
        rows={faqs}
        rowKey={(faq) => faq.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/faqs"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder={t("Pesquisar por pergunta...")}
        renderActions={(faq) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/faqs/${faq.id}/edit`}
              aria-label={t("Editar {value}", { value: faq.question })}
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
