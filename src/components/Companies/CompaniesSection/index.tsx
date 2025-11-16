import { FunctionComponent } from "react";

import { DiamondCompanies } from "@/utils/DiamondCompanies";
import { GoldCompanies } from "@/utils/GoldCompanies";
import { SilverCompanies } from "@/utils/SilverCompanies";
import { BronzeCompanies } from "@/utils/BronzeCompanies";
import HeadingText from "../../HeadingText";
import CompaniesContainer from "../CompaniesContainer";

const CompaniesSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center text-center">
      <CompaniesContainer companies={DiamondCompanies} tier="diamond" />
      <CompaniesContainer companies={GoldCompanies} tier="gold" />
      <CompaniesContainer companies={SilverCompanies} tier="silver" />
      <CompaniesContainer companies={BronzeCompanies} tier="bronze" />
    </section>
  );
};

export default CompaniesSection;
