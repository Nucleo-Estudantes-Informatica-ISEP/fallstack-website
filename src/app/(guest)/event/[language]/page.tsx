import { notFound } from "next/navigation";

import { serverEnv } from "@/config/env.server";
import type { HomepageSections } from "@/components/Content";
import CountdownLanding from "@/components/CountdownLanding";
import FeaturedCompanies from "@/components/FeaturedCompanies";
import HomePage from "@/components/HomePage";
import HomepageSection from "@/components/HomepageSection";
import {
  getPublicCompanyRoster,
  getPublicFaqs,
  getPublicSchedule,
  getPublicSponsors,
} from "@/application/services/publicEditionService";
import { Language } from "@/domain/i18n/translations";

// Generate each language on its first request. The build has no event DB or
// runtime showcase setting. Subsequent requests reuse the generated HTML.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ language: string }>;
}) {
  const { language: slug } = await params;
  if (slug !== "pt" && slug !== "en") notFound();
  const language = slug === "pt" ? Language.PT : Language.EN;
  if (serverEnv.SHOWCASE_FULL_WEBSITE) {
    const [schedule, companies, sponsors, faqs] = await Promise.all([
      getPublicSchedule(language),
      getPublicCompanyRoster(language),
      getPublicSponsors(),
      getPublicFaqs(language),
    ]);
    const sections: HomepageSections = {
      schedule: <HomepageSection section="schedule" data={schedule} />,
      companies: <HomepageSection section="companies" data={companies} />,
      sponsors: <HomepageSection section="sponsors" data={sponsors} />,
      faqs: <HomepageSection section="faqs" data={faqs} />,
    };
    return <HomePage sections={sections} />;
  }
  return (
    <CountdownLanding language={language}>
      <FeaturedCompanies
        language={language}
        companies={await getPublicCompanyRoster(language)}
      />
    </CountdownLanding>
  );
}
