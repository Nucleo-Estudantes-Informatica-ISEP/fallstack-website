import "server-only";

import CompaniesSection from "@/components/Companies/CompaniesSection";
import FaqSection from "@/components/Faq/FaqSection";
import ScheduleSection from "@/components/ScheduleSection";
import SponsorsSection from "@/components/SponsorsSection";
import type { HomepageDto } from "@/application/dto/homepageDto";
import {
  getPublicCompanyRoster,
  getPublicFaqs,
  getPublicSchedule,
  getPublicSponsors,
  readHomepageSection,
} from "@/application/services/publicEditionService";
import type { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

export default async function HomepageSection({
  section,
  language,
}: {
  section: keyof HomepageDto;
  language: Language;
}) {
  switch (section) {
    case "faqs":
      return (
        <FaqSection faqs={await readHomepageSection(getPublicFaqs(language))} />
      );
    case "schedule":
      return (
        <ScheduleSection
          firstDayTitle={branding.event.scheduleDayTitles[0]}
          secondDayTitle={branding.event.scheduleDayTitles[1]}
          events={await readHomepageSection(getPublicSchedule(language))}
        />
      );
    case "sponsors":
      return (
        <SponsorsSection
          sponsors={await readHomepageSection(getPublicSponsors())}
        />
      );
    case "companies":
      return (
        <CompaniesSection
          companies={await readHomepageSection(
            getPublicCompanyRoster(language)
          )}
        />
      );
  }
}
