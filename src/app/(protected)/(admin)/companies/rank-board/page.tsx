import CompanyRankBoard from "@/components/CompanyRankBoard";
import { getCompanyRanks } from "@/application/services/companyRankService";
import { getCompaniesForRankBoard } from "@/application/services/companyService";

const CompanyRankBoardPage = async () => {
  const [ranks, companies] = await Promise.all([
    getCompanyRanks(),
    getCompaniesForRankBoard(),
  ]);

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        Ordenar empresas por rank
      </h1>
      <CompanyRankBoard
        ranks={ranks.map((rank) => ({ id: rank.id, name: rank.name }))}
        companies={companies}
      />
    </section>
  );
};

export default CompanyRankBoardPage;
