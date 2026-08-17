import CompanyRankForm from "@/components/CompanyRankForm";

const NewCompanyRankPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">Adicionar rank</h1>
    <CompanyRankForm />
  </section>
);

export default NewCompanyRankPage;
