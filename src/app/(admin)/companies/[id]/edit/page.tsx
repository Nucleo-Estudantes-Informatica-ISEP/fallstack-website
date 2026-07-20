import { notFound } from "next/navigation";

import CompanyForm from "@/components/CompanyForm";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import { getCompany } from "@/application/services/companyService";

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

const EditCompanyPage = async ({ params }: EditCompanyPageProps) => {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar empresa</h1>
      <CompanyForm company={toAdminCompanyDto(company)} />
    </section>
  );
};

export default EditCompanyPage;
