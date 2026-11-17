import type { Metadata } from "next";
import React from "react";
import { headers } from "next/headers";

import CompanyPageSection from "@/components/Companies/CompanyPageSection";
import Custom404 from "@/app/not-found";
import { toCompanyDisplayDto } from "@/application/dto/companyDto";
import { getCompanyDisplayByName } from "@/application/services/companyService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";
import { createPublicPageMetadata } from "@/lib/seo";

interface CompanySearchProps {
  params: Promise<{
    name: string;
  }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export async function generateMetadata(
  props: CompanySearchProps
): Promise<Metadata> {
  const params = await props.params;
  const name = decodeURIComponent(params.name);
  try {
    const company = await getCompanyDisplayByName(name);
    if (!company || !company.rank.style?.hasInternalPage || !company.profile) {
      return createPublicPageMetadata({
        title: "Empresa não encontrada",
        path: `/company/${encodeURIComponent(name)}`,
        noIndex: true,
      });
    }

    const title = `${company.name} | Fallstack 2026`;
    const description =
      company.profile.descriptionPT ||
      company.profile.descriptionEN ||
      `${company.name} presente na 9ª edição do Fallstack 2026 no ISEP.`;

    const images = company.profile.banner
      ? [{ url: company.profile.banner, alt: `${company.name} Banner` }]
      : undefined;

    return createPublicPageMetadata({
      title,
      description,
      path: `/company/${encodeURIComponent(company.name)}`,
      images,
    });
  } catch {
    return createPublicPageMetadata({
      title: `${name} | Fallstack 2026`,
      path: `/company/${encodeURIComponent(name)}`,
    });
  }
}

const CompanyPage = async (props: CompanySearchProps) => {
  const params = await props.params;
  const { lang } = await props.searchParams;
  // Historically arrives with literal "%20"s undecoded (see the old
  // CompanyByName.ts's `.replaceAll("%20", " ")`) - decodeURIComponent
  // covers that plus any other percent-encoded character generally.
  const name = decodeURIComponent(params.name);
  const company = await getCompanyDisplayByName(name);
  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );

  // A rank without hasInternalPage never gets this page, and neither does a
  // rank that does but has no CompanyProfile content to show - both 404
  // rather than rendering an empty shell.
  if (!company || !company.rank.style?.hasInternalPage || !company.profile)
    return Custom404();

  return (
    <section className="artwork-clean artwork-readable flex size-full flex-col items-center">
      <CompanyPageSection company={toCompanyDisplayDto(company, language)} />
    </section>
  );
};

export default CompanyPage;
