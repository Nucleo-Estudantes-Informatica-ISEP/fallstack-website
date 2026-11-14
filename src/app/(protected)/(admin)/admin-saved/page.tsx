import React from "react";

import AdminSavedSection from "@/components/AdminSavedSection";
import { toCompanyDto } from "@/application/dto/companyDto";
import { getCompanies } from "@/application/services/companyService";

const giveaway = async () => {
  const companies = await getCompanies();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <AdminSavedSection companies={companies.map(toCompanyDto)} />
    </section>
  );
};

export default giveaway;
