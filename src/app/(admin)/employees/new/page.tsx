import EmployeeForm from "@/components/EmployeeForm";
import { getCompanies } from "@/application/services/companyService";

const NewEmployeePage = async () => {
  const companies = await getCompanies();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Adicionar recrutador</h1>
      <EmployeeForm
        companyOptions={companies.map((c) => ({ label: c.name, value: c.id }))}
      />
    </section>
  );
};

export default NewEmployeePage;
