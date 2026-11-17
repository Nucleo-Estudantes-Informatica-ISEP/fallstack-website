import { notFound } from "next/navigation";

import FaqForm from "@/components/FaqForm";
import { toAdminFaqDto } from "@/application/dto/faqDto";
import { getFaqEntry } from "@/application/services/faqService";
import { getUiText } from "@/application/services/uiLanguageService";

interface EditFaqPageProps {
  params: Promise<{ id: string }>;
}

const EditFaqPage = async ({ params }: EditFaqPageProps) => {
  const t = await getUiText();

  const { id } = await params;
  const faq = await getFaqEntry(id);
  if (!faq) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Editar pergunta")}
      </h1>
      <FaqForm faq={toAdminFaqDto(faq)} />
    </section>
  );
};

export default EditFaqPage;
