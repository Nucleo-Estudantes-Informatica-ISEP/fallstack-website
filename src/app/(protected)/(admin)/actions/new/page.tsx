import ActionForm from "@/components/ActionForm";
import { getCompanies } from "@/application/services/companyService";

const NewActionPage = async () => {
  const companies = await getCompanies();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Adicionar ação</h1>
      <ActionForm companies={companies} />
    </section>
  );
};

export default NewActionPage;
