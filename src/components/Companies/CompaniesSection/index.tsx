"use client";

import { FunctionComponent } from "react";

import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { BronzeCompanies } from "@/utils/BronzeCompanies";
import { DiamondCompanies } from "@/utils/DiamondCompanies";
import { GoldCompanies } from "@/utils/GoldCompanies";
import { SilverCompanies } from "@/utils/SilverCompanies";

import { COMPANY_TIER } from "@/domain/Company/company-tier";

const CompaniesSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center text-center">
      <CompaniesContainer companies={DiamondCompanies} tier={COMPANY_TIER.DIAMOND} />
      <CompaniesContainer companies={GoldCompanies} tier={COMPANY_TIER.GOLD} />
      <CompaniesContainer companies={SilverCompanies} tier={COMPANY_TIER.SILVER} />
      <CompaniesContainer companies={BronzeCompanies} tier={COMPANY_TIER.BRONZE} />
    </section>
  );
};

export default CompaniesSection;
