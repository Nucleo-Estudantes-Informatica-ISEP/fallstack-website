import React from "react";

import CompanyPageSection from "@/components/Companies/CompanyPageSection";
import Custom404 from "@/app/not-found";
import { getCompanyDisplayByName } from "@/application/services/companyService";
import { COMPANY_TIER } from "@/domain/Company/company-tier";
import { findEditionContentByName } from "@/edition";

interface CompanySearchProps {
  params: Promise<{
    name: string;
  }>;
}

const CompanyPage = async (props: CompanySearchProps) => {
  const params = await props.params;
  const company = await getCompanyDisplayByName(params.name);

  if (!company || company.tier === COMPANY_TIER.SILVER) return Custom404();

  const editionContent = findEditionContentByName(params.name);
  if (!editionContent?.modalInformation) return Custom404();

  return (
    <section className="flex size-full flex-col items-center bg-black">
      <CompanyPageSection
        companyName={params.name}
        logoHref={company.avatar}
        tier={company.tier}
      />
    </section>
  );
};

export default CompanyPage;
