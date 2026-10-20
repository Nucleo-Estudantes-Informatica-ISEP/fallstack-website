"use client";

import { FunctionComponent } from "react";

import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { CompanyProps } from "@/components/Companies/Company";
import type { CompanyRankDto } from "@/application/dto/companyDto";
import type { HomepageDto } from "@/application/dto/homepageDto";

function toCompanyProps(
  company: HomepageDto["companies"][number]
): CompanyProps {
  return {
    name: company.name,
    logoHref: company.avatar ?? undefined,
    websiteUrl: company.website ?? undefined,
    hasContent: company.hasContent,
    rankStyle: company.rank.style,
    className: company.className ?? undefined,
    logoWidth: company.logoWidth ?? undefined,
    logoHeight: company.logoHeight ?? undefined,
  };
}

interface RankGroup {
  rank: CompanyRankDto;
  companies: CompanyProps[];
}

// Ranks are now data (CompanyRank), not a fixed 4-value enum - grouping and
// ordering companies here (rather than iterating a hardcoded tier list) is
// the whole point of #280: a new rank shows up with zero code changes.
function groupByRank(companies: HomepageDto["companies"]): RankGroup[] {
  const groups = new Map<string, RankGroup>();
  for (const company of companies) {
    const props = toCompanyProps(company);
    const group = groups.get(company.rank.id);
    if (group) group.companies.push(props);
    else
      groups.set(company.rank.id, { rank: company.rank, companies: [props] });
  }
  return [...groups.values()].sort((a, b) => a.rank.order - b.rank.order);
}

interface CompaniesSectionProps {
  companies: HomepageDto["companies"];
}

const CompaniesSection: FunctionComponent<CompaniesSectionProps> = ({
  companies,
}) => {
  return (
    <section className="flex flex-col items-center text-center">
      {groupByRank(companies).map(({ rank, companies }) => (
        <CompaniesContainer key={rank.id} rank={rank} companies={companies} />
      ))}
    </section>
  );
};

export default CompaniesSection;
