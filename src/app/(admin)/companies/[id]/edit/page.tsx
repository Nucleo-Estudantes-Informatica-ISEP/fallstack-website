import { notFound } from "next/navigation";

import CompanyContentForm, {
  type CompanyContentValue,
} from "@/components/CompanyContentForm";
import CompanyForm from "@/components/CompanyForm";
import type { AdminCompanyDto } from "@/application/dto/companyDto";
import { getCompanyRanks } from "@/application/services/companyRankService";
import { getCompanyWithContent } from "@/application/services/companyService";
import { getInterests } from "@/application/services/interestService";
import {
  parseFacts,
  parseSocialLinks,
} from "@/domain/company/companyProfileContent";

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

type CompanyWithContent = NonNullable<
  Awaited<ReturnType<typeof getCompanyWithContent>>
>;

function toAdminCompanyDto(company: CompanyWithContent): AdminCompanyDto {
  return {
    id: company.id,
    name: company.name,
    avatar: company.avatar,
    website: company.website,
    active: company.active,
    order: company.order,
    rank: { id: company.rank.id, name: company.rank.name },
  };
}

function toContentValue(
  companyId: string,
  content: CompanyWithContent
): CompanyContentValue {
  return {
    companyId,
    bodyText: content.profile?.bodyText ?? "",
    videoTitle: content.profile?.videoTitle ?? null,
    videoHref: content.profile?.videoHref ?? null,
    socialLinks: parseSocialLinks(content.profile?.socialLinks),
    facts: parseFacts(content.profile?.facts),
    logoWidth: content.displayStyle?.logoWidth ?? null,
    logoHeight: content.displayStyle?.logoHeight ?? null,
    className: content.displayStyle?.className ?? null,
    interestIds: content.interests.map((interest) => interest.id),
  };
}

const EditCompanyPage = async ({ params }: EditCompanyPageProps) => {
  const { id } = await params;
  const [company, ranks, interests] = await Promise.all([
    getCompanyWithContent(id),
    getCompanyRanks(),
    getInterests(),
  ]);
  if (!company) notFound();

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Editar empresa</h1>
      <CompanyForm
        company={toAdminCompanyDto(company)}
        ranks={ranks.map((rank) => ({ id: rank.id, name: rank.name }))}
      />
      <h2 className="text-xl font-bold text-gray-800">
        Conteúdo da página interna
      </h2>
      <CompanyContentForm
        content={toContentValue(id, company)}
        interestOptions={interests}
      />
    </section>
  );
};

export default EditCompanyPage;
