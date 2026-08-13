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
    <motion.div className="flex w-full flex-col items-center justify-center border-b-1 border-secondary py-8 md:py-12 lg:py-16">
      <h2 className="z-0 mx-2 mb-8 text-center text-5xl lg:mb-4">
        <span className="text-secondary">Parceiros</span>{" "}
        <span
          className="bg-clip-text text-transparent"
          style={rank.style ? rankGradientStyle(rank.style) : undefined}
        >
          {rank.name}
        </span>
      </h2>
      <section className={`w-full rounded-3xl px-4`}>
        <div className="my-2 grid w-full grid-cols-2 place-items-center gap-4 sm:gap-6 md:flex md:flex-wrap md:items-center md:justify-center md:gap-12 lg:gap-16">
          {companies.map((company) => (
            <Company key={company.name} {...company} />
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default CompaniesContainer;
