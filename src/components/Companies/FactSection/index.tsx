"use client";

import { Fact } from "@/domain/company/companyProfileContent";
import { FACT_ICONS } from "@/domain/company/factIcons";

interface FactSectionProps {
  facts: Fact[];
}

const FactSection: React.FC<FactSectionProps> = ({ facts }) => {
  return (
    <section className="my-5 flex flex-col space-y-2 text-sm leading-8 font-light sm:text-sm lg:px-10 lg:text-lg">
      {facts.map((fact) => {
        const Icon = FACT_ICONS[fact.iconName];
        return (
          <div
            key={fact.description}
            className="my-1 grid grid-cols-10 items-center"
          >
            <Icon className="left-0 fill-stone-500 text-2xl" />
            <div className="col-span-9 ml-3 text-left leading-5 text-black">
              {fact.description}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default FactSection;
