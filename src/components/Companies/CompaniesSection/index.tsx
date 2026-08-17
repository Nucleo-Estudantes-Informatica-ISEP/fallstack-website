"use client";

import { FunctionComponent, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import CompaniesContainer from "@/components/Companies/CompaniesContainer";
import { CompanyProps } from "@/components/Companies/Company";
import type {
  CompanyRankDto,
  CompanyRosterDto,
} from "@/application/dto/companyDto";

function toCompanyProps(company: CompanyRosterDto): CompanyProps | null {
  if (!company.avatar) return null;

  return {
    name: company.name,
    logoHref: company.avatar,
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
function groupByRank(companies: CompanyRosterDto[]): RankGroup[] {
  const groups = new Map<string, RankGroup>();
  for (const company of companies) {
    const props = toCompanyProps(company);
    if (!props) continue;
    const group = groups.get(company.rank.id);
    if (group) group.companies.push(props);
    else
      groups.set(company.rank.id, { rank: company.rank, companies: [props] });
  }
  return [...groups.values()].sort((a, b) => a.rank.order - b.rank.order);
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

  return (
    <section className="flex flex-col items-center text-center">
      {groupByRank(companies).map(({ rank, companies }) => (
        <CompaniesContainer key={rank.id} rank={rank} companies={companies} />
      ))}
    </section>
  );
};

export default CompaniesSection;
