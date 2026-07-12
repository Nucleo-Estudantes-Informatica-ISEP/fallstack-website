"use client";

import { FunctionComponent } from "react";

import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { edition } from "@/edition";

const CompaniesSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center text-center">
      <CompaniesContainer companies={edition.tiers.diamond} tier="diamond" />
      <CompaniesContainer companies={edition.tiers.gold} tier="gold" />
      <CompaniesContainer companies={edition.tiers.silver} tier="silver" />
      <CompaniesContainer companies={edition.tiers.bronze} tier="bronze" />
    </section>
  );
};

export default CompaniesSection;
