import React from "react";

import CompanyAdminSection from "@/components/CompanyAdminSection";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import { listCompaniesForAdmin } from "@/application/services/companyService";

const CompaniesAdminPage = async () => {
  const companies = await listCompaniesForAdmin();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <CompanyAdminSection companies={companies.map(toAdminCompanyDto)} />
    </section>
  );
};

export default CompaniesAdminPage;
