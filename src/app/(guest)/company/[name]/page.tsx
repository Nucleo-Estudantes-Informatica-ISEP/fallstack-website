import React from "react";

import CompanyPageSection from "@/components/Companies/CompanyPageSection";
import Custom404 from "@/app/not-found";
import findCompanyByName from "@/utils/CompanyByName";

interface CompanySearchProps {
  params: Promise<{
    name: string;
  }>;
}

import { COMPANY_TIER } from "@/domain/Company/company-tier";

const CompanyPage = async (props: CompanySearchProps) => {
  const params = await props.params;
  const company = findCompanyByName(params.name);

  if (company === null || company.tier === COMPANY_TIER.SILVER) return Custom404();

  const companyProps = company.props;
  const modalInformation = companyProps.modalInformation;

  if (modalInformation === undefined) return Custom404();

  //  const interests = await fetchInterestsByCompanyName(company.props.name);
  // const interests = company.props.interests!;

  return (
    <section className="flex size-full flex-col items-center bg-black">
      <CompanyPageSection companyName={params.name} />
    </section>
  );
};

export default CompanyPage;
