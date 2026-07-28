import CompanyForm from "@/components/CompanyForm";

const NewCompanyPage = () => (
  <section className="flex flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold text-gray-800">Adicionar empresa</h1>
    <CompanyForm />
  </section>
);

export default NewCompanyPage;
