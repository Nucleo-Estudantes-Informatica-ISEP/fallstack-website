"use client";

import React, { FunctionComponent } from "react";
import { motion } from "framer-motion";

import Company, { CompanyProps } from "@/components/Companies/Company";
import type { CompanyRankDto } from "@/application/dto/companyDto";
import { rankGradientStyle } from "@/domain/company/services/rank-styling";

interface CompaniesContainerProps {
  rank: CompanyRankDto;
  companies: CompanyProps[];
}

const CompaniesContainer: FunctionComponent<CompaniesContainerProps> = ({
  rank,
  companies,
}) => {
  return (
    <motion.div className="flex w-full flex-col items-center justify-center border-b border-secondary py-8 md:py-12 lg:py-16">
      <h2 className="z-0 mx-2 mb-8 text-center text-3xl md:text-4xl lg:mb-4">
        <span className="text-secondary">Parceiros</span>{" "}
        <span
          className="bg-clip-text text-transparent"
          style={rank.style ? rankGradientStyle(rank.style) : undefined}
        >
          {rank.name}
        </span>
      </h2>
      <section className={`w-full rounded-3xl px-4`}>
        <div className="mx-auto my-2 flex w-full max-w-5xl flex-wrap items-center justify-center gap-4">
          {companies.map((company) => (
            <Company key={company.name} {...company} />
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default CompaniesContainer;
