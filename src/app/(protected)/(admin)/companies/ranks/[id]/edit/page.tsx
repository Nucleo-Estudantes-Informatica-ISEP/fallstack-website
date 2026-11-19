import { notFound } from "next/navigation";

import CompanyRankForm from "@/components/CompanyRankForm";
import { toAdminCompanyRankDto } from "@/application/dto/companyRankDto";
import { getCompanyRank } from "@/application/services/companyRankService";
import { getUiText } from "@/application/services/uiLanguageService";

interface EditCompanyRankPageProps {
  params: Promise<{ id: string }>;
}

const EditCompanyRankPage = async ({ params }: EditCompanyRankPageProps) => {
  const t = await getUiText();

  const { id } = await params;
  const rank = await getCompanyRank(id);
  if (!rank) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">{t("Editar rank")}</h1>
      <CompanyRankForm rank={toAdminCompanyRankDto(rank)} />
    </section>
  );
};

export default EditCompanyRankPage;
