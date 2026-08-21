import React from "react";
import { headers } from "next/headers";

import CompanyPageSection from "@/components/Companies/CompanyPageSection";
import Custom404 from "@/app/not-found";
import { toCompanyDisplayDto } from "@/application/dto/companyDto";
import { getCompanyDisplayByName } from "@/application/services/companyService";
import { resolveLanguage } from "@/domain/i18n/translations";

interface CompanySearchProps {
  params: Promise<{
    name: string;
  }>;
}

const CompanyPage = async (props: CompanySearchProps) => {
  const params = await props.params;
  // Historically arrives with literal "%20"s undecoded (see the old
  // CompanyByName.ts's `.replaceAll("%20", " ")`) - decodeURIComponent
  // covers that plus any other percent-encoded character generally.
  const name = decodeURIComponent(params.name);
  const company = await getCompanyDisplayByName(name);
  const language = resolveLanguage((await headers()).get("accept-language"));

  // A rank without hasInternalPage never gets this page, and neither does a
  // rank that does but has no CompanyProfile content to show - both 404
  // rather than rendering an empty shell.
  if (!company || !company.rank.style?.hasInternalPage || !company.profile)
    return Custom404();

  return (
    <section className="flex size-full flex-col items-center bg-black">
      <CompanyPageSection company={toCompanyDisplayDto(company, language)} />
    </section>
  );
};

export default CompanyPage;
