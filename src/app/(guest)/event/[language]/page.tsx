import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { serverEnv } from "@/config/env.server";
import type { HomepageSections } from "@/components/Content";
import CountdownLanding from "@/components/CountdownLanding";
import FeaturedCompanies from "@/components/FeaturedCompanies";
import HomeCallToAction from "@/components/HomeCallToAction";
import HomePage from "@/components/HomePage";
import HomepageSection from "@/components/HomepageSection";
import OffseasonLanding from "@/components/OffseasonLanding";
import {
  getPublicCompanyRoster,
  getPublicFaqs,
  getPublicSchedule,
  getPublicSponsors,
} from "@/application/services/publicEditionService";
import { Language } from "@/domain/i18n/translations";
import {
  buildEventJsonLd,
  buildWebsiteJsonLd,
  createPublicPageMetadata,
} from "@/lib/seo";

// Generate each language on its first request. The build has no event DB or
// runtime showcase setting. Subsequent requests reuse the generated HTML.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ language: string }>;
}): Promise<Metadata> {
  const { language: slug } = await params;
  if (slug !== "pt" && slug !== "en") return {};

  const isEn = slug === "en";
  const title = isEn
    ? "Fallstack 2026 - 9th Edition | Tech Event at ISEP"
    : "Fallstack 2026 - 9ª Edição | Evento de Tecnologia no ISEP";
  const description = isEn
    ? "Fallstack 2026 returns for its 9th edition at ISEP on November 17-18. Schedule, companies, talks, and networking at the premier tech event hosted by NEI-ISEP."
    : "O Fallstack 2026 está de volta para a sua 9ª edição no ISEP a 17 e 18 de novembro. O maior evento de empregabilidade e tecnologia organizado pelo Núcleo de Estudantes de Informática do ISEP (NEI-ISEP).";

  return createPublicPageMetadata({
    title,
    description,
    path: `/event/${slug}`,
    language: isEn ? "en" : "pt",
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ language: string }>;
}) {
  const { language: slug } = await params;
  if (slug !== "pt" && slug !== "en") notFound();
  const language = slug === "pt" ? Language.PT : Language.EN;

  const eventJsonLd = buildEventJsonLd(slug as "pt" | "en");
  const websiteJsonLd = buildWebsiteJsonLd();

  const renderContent = async () => {
    if (serverEnv.EVENT_MODE === "offseason") {
      return <OffseasonLanding language={language} />;
    }
    if (serverEnv.SHOWCASE_FULL_WEBSITE) {
      const [schedule, companies, sponsors, faqs] = await Promise.all([
        getPublicSchedule(language),
        getPublicCompanyRoster(language),
        getPublicSponsors(),
        getPublicFaqs(language),
      ]);
      const sections: HomepageSections = {
        schedule: (
          <HomepageSection
            language={language}
            section="schedule"
            data={schedule}
          />
        ),
        companies: (
          <HomepageSection
            language={language}
            section="companies"
            data={companies}
          />
        ),
        sponsors: (
          <HomepageSection
            language={language}
            section="sponsors"
            data={sponsors}
          />
        ),
        faqs: <HomepageSection language={language} section="faqs" data={faqs} />,
      };
      return <HomePage language={language} sections={sections} />;
    }
    return (
      <CountdownLanding
        language={language}
        callToAction={<HomeCallToAction language={language} />}
      >
        <FeaturedCompanies
          language={language}
          companies={await getPublicCompanyRoster(language)}
        />
      </CountdownLanding>
    );
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {await renderContent()}
    </>
  );
}
