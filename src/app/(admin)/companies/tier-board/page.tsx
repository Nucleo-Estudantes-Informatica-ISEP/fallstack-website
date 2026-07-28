import CompanyTierBoard from "@/components/CompanyTierBoard";
import { getCompaniesForTierBoard } from "@/application/services/companyService";

const CompanyTierBoardPage = async () => {
  const companies = await getCompaniesForTierBoard();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        Ordenar empresas por tier
      </h1>
      <CompanyTierBoard companies={companies} />
    </section>
  );
};

export default CompanyTierBoardPage;
