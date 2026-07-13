"use client";

import { FunctionComponent } from "react";

import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { COMPANY_TIER } from "@/domain/Company/company-tier";
import { edition } from "@/edition";

const CompaniesSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center text-center">
      <CompaniesContainer companies={edition.tiers.diamond} tier={COMPANY_TIER.DIAMOND} />
      <CompaniesContainer companies={edition.tiers.gold} tier={COMPANY_TIER.GOLD} />
      <CompaniesContainer companies={edition.tiers.silver} tier={COMPANY_TIER.SILVER} />
      <CompaniesContainer companies={edition.tiers.bronze} tier={COMPANY_TIER.BRONZE} />
    </section>
  );
};

export default CompaniesSection;
