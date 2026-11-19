import { notFound } from "next/navigation";

import InterestForm from "@/components/InterestForm";
import { toAdminInterestDto } from "@/application/dto/interestDto";
import { getInterest } from "@/application/services/interestService";
import { getUiText } from "@/application/services/uiLanguageService";

interface EditInterestPageProps {
  params: Promise<{ id: string }>;
}

const EditInterestPage = async ({ params }: EditInterestPageProps) => {
  const t = await getUiText();

  const { id } = await params;
  const interest = await getInterest(id);
  if (!interest) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Editar interesse")}
      </h1>
      <InterestForm interest={toAdminInterestDto(interest)} />
    </section>
  );
};

export default EditInterestPage;
