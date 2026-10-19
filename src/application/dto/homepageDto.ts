import type { CompanyRosterDto } from "./companyDto";
import type { FaqDto } from "./faqDto";
import type { ScheduleEventDto } from "./scheduleDto";
import type { SponsorDto } from "./sponsorDto";

export interface HomepageDto {
  faqs: FaqDto[];
  schedule: ScheduleEventDto[];
  sponsors: SponsorDto[];
  companies: CompanyRosterDto[];
}
