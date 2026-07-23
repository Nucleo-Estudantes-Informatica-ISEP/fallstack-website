import { notFound } from "next/navigation";

import FaqForm from "@/components/FaqForm";
import { toFaqDto } from "@/application/dto/faqDto";
import { getFaqEntry } from "@/application/services/faqService";

interface EditFaqPageProps {
  params: Promise<{ id: string }>;
}

const EditFaqPage = async ({ params }: EditFaqPageProps) => {
  const { id } = await params;
  const faq = await getFaqEntry(id);
  if (!faq) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar pergunta</h1>
      <FaqForm faq={toFaqDto(faq)} />
    </section>
  );
};

export default EditFaqPage;
