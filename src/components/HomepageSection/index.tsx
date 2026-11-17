import "server-only";

import CompaniesSection from "@/components/Companies/CompaniesSection";
import FaqSection from "@/components/Faq/FaqSection";
import ScheduleSection from "@/components/ScheduleSection";
import SponsorsSection from "@/components/SponsorsSection";
import type { HomepageDto } from "@/application/dto/homepageDto";
import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

type HomepageSectionProps = { language?: Language } & {
  [Section in keyof HomepageDto]: {
    section: Section;
    data: HomepageDto[Section];
  };
}[keyof HomepageDto];

export default function HomepageSection(props: HomepageSectionProps) {
  const language = props.language ?? Language.PT;
  const dayTitle = (index: number) =>
    language === Language.EN
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "long",
          timeZone: "Europe/Lisbon",
        }).format(
          new Date(
            index === 0 ? branding.event.startsAt : branding.event.endsAt
          )
        )
      : branding.event.scheduleDayTitles[index];
  switch (props.section) {
    case "faqs":
      return <FaqSection faqs={props.data} />;
    case "schedule":
      return (
        <ScheduleSection
          language={language}
          firstDayTitle={dayTitle(0)}
          secondDayTitle={dayTitle(1)}
          events={props.data}
        />
      );
    case "sponsors":
      return <SponsorsSection sponsors={props.data} language={language} />;
    case "companies":
      return <CompaniesSection companies={props.data} language={language} />;
  }
}
