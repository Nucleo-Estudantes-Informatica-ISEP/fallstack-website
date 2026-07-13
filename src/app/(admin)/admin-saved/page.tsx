import React from "react";

import AdminSavedSection from "@/components/AdminSavedSection";
import Custom404 from "@/app/not-found";
import { toCompanyDto } from "@/application/dto/companyDto";
import { getCompanies } from "@/application/services/companyService";
import getServerSession from "@/application/services/sessionService";

const giveaway = async () => {
  const session = await getServerSession();

  if (!session || !session.isAdmin) {
    return Custom404();
  }

  const companies = await getCompanies();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <AdminSavedSection companies={companies.map(toCompanyDto)} />
    </section>
  );
};

export default giveaway;
