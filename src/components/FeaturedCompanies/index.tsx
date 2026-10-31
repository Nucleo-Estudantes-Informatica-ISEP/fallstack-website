import Image from "next/image";
import Link from "next/link";

import {
  getPublicCompanyRoster,
  readHomepageSection,
} from "@/application/services/publicEditionService";
import { companyProfileHref } from "@/domain/company/services/rank-access";
import { Language } from "@/domain/i18n/translations";

export default async function FeaturedCompanies({
  language,
}: {
  language: Language;
}) {
  const companies = (
    await readHomepageSection(getPublicCompanyRoster(language))
  )
    .filter((company) => company.rank.style?.isFeatured)
    .sort(
      (a, b) =>
        a.rank.order - b.rank.order ||
        a.order - b.order ||
        a.name.localeCompare(b.name)
    );

  if (!companies.length) return null;

  return (
    <section
      aria-label={
        language === Language.EN ? "Featured partners" : "Parceiros em destaque"
      }
      className="bg-background px-6 py-8"
    >
      <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-12">
        {companies.map((company) => {
          const href = companyProfileHref(
            company.rank.style?.hasInternalPage ?? false,
            company.name,
            company.website ?? undefined,
            company.hasContent
          );
          return (
            <li
              key={company.id}
              className="flex h-16 w-32 items-center justify-center"
            >
              <Link
                href={href}
                target={href.startsWith("/") ? "_self" : "_blank"}
                rel="noreferrer"
                className="flex size-full items-center justify-center rounded-md text-center text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {company.avatar ? (
                  <Image
                    src={company.avatar}
                    alt={company.name}
                    width={120}
                    height={48}
                    className="h-12 w-30 object-contain"
                  />
                ) : (
                  company.name
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
