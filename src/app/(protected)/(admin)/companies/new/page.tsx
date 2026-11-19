import CompanyForm from "@/components/CompanyForm";
import { getCompanyRanks } from "@/application/services/companyRankService";
import { getUiText } from "@/application/services/uiLanguageService";

const NewCompanyPage = async () => {
  const t = await getUiText();

  const ranks = await getCompanyRanks();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Adicionar empresa")}
      </h1>
      <CompanyForm
        ranks={ranks.map((rank) => ({ id: rank.id, name: rank.name }))}
      />
    </section>
  );
};

export default NewCompanyPage;
