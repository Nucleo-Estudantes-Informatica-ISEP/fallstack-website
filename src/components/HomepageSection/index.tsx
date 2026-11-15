import "server-only";

import CompaniesSection from "@/components/Companies/CompaniesSection";
import FaqSection from "@/components/Faq/FaqSection";
import ScheduleSection from "@/components/ScheduleSection";
import SponsorsSection from "@/components/SponsorsSection";
import type { HomepageDto } from "@/application/dto/homepageDto";
import { branding } from "@/edition/branding";

type HomepageSectionProps = {
  [Section in keyof HomepageDto]: {
    section: Section;
    data: HomepageDto[Section];
  };
}[keyof HomepageDto];

export default function HomepageSection(props: HomepageSectionProps) {
  switch (props.section) {
    case "faqs":
      return <FaqSection faqs={props.data} />;
    case "schedule":
      return (
        <ScheduleSection
          firstDayTitle={branding.event.scheduleDayTitles[0]}
          secondDayTitle={branding.event.scheduleDayTitles[1]}
          events={props.data}
        />
      );
    case "sponsors":
      return <SponsorsSection sponsors={props.data} />;
    case "companies":
      return <CompaniesSection companies={props.data} />;
  }
}
