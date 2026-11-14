import { notFound } from "next/navigation";

import EmployeeForm from "@/components/EmployeeForm";
import { toAdminEmployeeDto } from "@/application/dto/employeeDto";
import { getCompanies } from "@/application/services/companyService";
import { getEmployeeById } from "@/application/services/employeeService";

interface EditEmployeePageProps {
  params: Promise<{ id: string }>;
}

const EditEmployeePage = async ({ params }: EditEmployeePageProps) => {
  const { id } = await params;
  const [employee, companies] = await Promise.all([
    getEmployeeById(id),
    getCompanies(),
  ]);
  if (!employee) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar recrutador</h1>
      <EmployeeForm
        employee={toAdminEmployeeDto(employee)}
        companyOptions={companies.map((c) => ({ label: c.name, value: c.id }))}
      />
    </section>
  );
};

export default EditEmployeePage;
