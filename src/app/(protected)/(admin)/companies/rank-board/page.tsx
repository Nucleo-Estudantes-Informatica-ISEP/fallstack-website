import CompanyRankBoard from "@/components/CompanyRankBoard";
import { getCompanyRanks } from "@/application/services/companyRankService";
import { getCompaniesForRankBoard } from "@/application/services/companyService";
import { getUiText } from "@/application/services/uiLanguageService";

const CompanyRankBoardPage = async () => {
  const t = await getUiText();

  const [ranks, companies] = await Promise.all([
    getCompanyRanks(),
    getCompaniesForRankBoard(),
  ]);

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        {t("Ordenar empresas por rank")}
      </h1>
      <CompanyRankBoard
        ranks={ranks.map((rank) => ({ id: rank.id, name: rank.name }))}
        companies={companies}
      />
    </section>
  );
};

export default CompanyRankBoardPage;
