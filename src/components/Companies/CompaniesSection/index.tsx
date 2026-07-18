"use client";

import { FunctionComponent, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { CompanyProps } from "@/components/Companies/Company";
import type { CompanyRosterDto } from "@/application/dto/companyDto";
import { COMPANY_TIER, CompanyTier } from "@/domain/Company/company-tier";
import { findEditionContentByName } from "@/edition";

function toCompanyProps(company: CompanyRosterDto): CompanyProps | null {
  if (!company.avatar) return null;

  const editionContent = findEditionContentByName(company.name);

  return {
    name: company.name,
    logoHref: company.avatar,
    websiteUrl: company.website ?? undefined,
    tier: company.tier,
    modalInformation: editionContent?.modalInformation,
    interests: editionContent?.interests,
    className: editionContent?.className,
    logoWidth: editionContent?.logoWidth,
    logoHeight: editionContent?.logoHeight,
  };
}

const CompaniesSection: FunctionComponent = () => {
  const [companies, setCompanies] = useState<CompanyRosterDto[] | null>(null);

  useEffect(() => {
    httpClient
      .get<CompanyRosterDto[]>("/companies/roster")
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  if (!companies) return null;

  const byTier = (tier: CompanyTier): CompanyProps[] =>
    companies
      .filter((company) => company.tier === tier)
      .map(toCompanyProps)
      .filter((company): company is CompanyProps => company !== null);

  return (
    <section className="flex flex-col items-center text-center">
      <CompaniesContainer
        companies={byTier(COMPANY_TIER.DIAMOND)}
        tier={COMPANY_TIER.DIAMOND}
      />
      <CompaniesContainer
        companies={byTier(COMPANY_TIER.GOLD)}
        tier={COMPANY_TIER.GOLD}
      />
      <CompaniesContainer
        companies={byTier(COMPANY_TIER.SILVER)}
        tier={COMPANY_TIER.SILVER}
      />
      <CompaniesContainer
        companies={byTier(COMPANY_TIER.BRONZE)}
        tier={COMPANY_TIER.BRONZE}
      />
    </section>
  );
};

export default CompaniesSection;
