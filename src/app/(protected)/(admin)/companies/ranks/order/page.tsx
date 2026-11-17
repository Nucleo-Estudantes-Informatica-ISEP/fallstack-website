import CompanyRankOrderBoard from "@/components/CompanyRankOrderBoard";
import { getCompanyRanks } from "@/application/services/companyRankService";
import { getUiText } from "@/application/services/uiLanguageService";

const CompanyRankOrderPage = async () => {
  const t = await getUiText();

  const ranks = await getCompanyRanks();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">{t("Ordenar ranks")}</h1>
      <CompanyRankOrderBoard
        ranks={ranks.map((rank) => ({ id: rank.id, name: rank.name }))}
      />
    </section>
  );
};

export default CompanyRankOrderPage;
